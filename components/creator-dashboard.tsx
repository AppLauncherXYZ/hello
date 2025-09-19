'use client';

import React, { useEffect, useMemo, useState } from 'react';

/**
 * CreatorDashboard
 * ------------------------------------------------------------
 * A single-file, portable creator dashboard for *generated apps*.
 * Assumptions (soft contracts):
 *  - The app runs on the same origin as parent routes, so relative /api/* works.
 *  - URL has ?userId=<uid>&projectId=<pid> (your generator already does this).
 *  - Required route:   GET /api/credits/balance?userId&projectId
 *  - Optional routes:  GET /api/credits/transactions?userId&projectId&role=creator
 *                      POST /api/credits/payout
 *
 * Behavior:
 *  - If the user is a creator, a floating button appears (“Creator Dashboard”).
 *  - Clicking it opens an in-app panel with balances, quick stats and (if available)
 *    a transaction table. Missing optional endpoints simply hide those sections.
 *
 * Styling: Tailwind only. No external libs.
 */

type BalanceResponse = {
  role?: 'creator' | 'user' | string;
  // Recommend your /balance to return these fields for creators:
  totalEarnedCents?: number;     // lifetime gross earned
  availableCents?: number;       // withdrawable amount
  pendingCents?: number;         // pending/escrow
  last30DaysCents?: number;      // convenience metric
  currency?: string;             // e.g., 'USD' — optional, display only
};

type Txn = {
  id: string;
  type: 'sale' | 'refund' | 'payout' | 'adjustment' | string;
  amountCents: number;     // positive for sale, negative for refund/payout
  createdAt: string;       // ISO string
  note?: string;
};

type TransactionsResponse = {
  items: Txn[];
};

function useQueryParam(name: string) {
  const [v, setV] = useState<string | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setV(sp.get(name));
  }, [name]);
  return v;
}

function formatMoney(cents?: number, currency?: string) {
  if (cents == null) return '—';
  const amount = (cents / 100).toFixed(2);
  return currency ? `${currency} ${amount}` : `$${amount}`;
}

function softRound(n?: number) {
  if (typeof n !== 'number') return '—';
  return Math.round(n);
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function endpointExists(path: string) {
  try {
    const res = await fetch(path, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

export default function CreatorDashboard() {
  const userId = useQueryParam('userId');
  const projectId = useQueryParam('projectId');

  const [isOpen, setIsOpen] = useState(false);
  const [isCreator, setIsCreator] = useState<boolean | null>(null);

  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [txns, setTxns] = useState<Txn[] | null>(null);
  const [txnError, setTxnError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState<string | null>(null);

  const currency = balance?.currency;

  // Fetch balance (required) + infer creator if no explicit endpoint exists.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId || !projectId) return;

      setLoading(true);
      setTxnError(null);
      setPayoutMsg(null);

      // Attempt explicit creator check first (optional)
      let explicitCreator: boolean | null = null;
      try {
        const hasCreatorCheck = await endpointExists('/api/creators/is-creator');
        if (hasCreatorCheck) {
          const res = await fetch(`/api/creators/is-creator?userId=${encodeURIComponent(userId)}&projectId=${encodeURIComponent(projectId)}`);
          if (res.ok) {
            const data = await safeJson<{ isCreator: boolean }>(res);
            explicitCreator = !!data?.isCreator;
          }
        }
      } catch {
        // ignore, we'll infer below
      }

      // Required: balance
      let b: BalanceResponse | null = null;
      try {
        const res = await fetch(`/api/credits/balance?userId=${encodeURIComponent(userId)}&projectId=${encodeURIComponent(projectId)}`);
        if (res.ok) b = await safeJson<BalanceResponse>(res);
      } catch {
        // swallow
      }

      // Infer creator if explicit not available: role === 'creator' OR any creator fields present
      const inferredCreator =
        explicitCreator ??
        !!(b?.role === 'creator' || typeof b?.totalEarnedCents === 'number' || typeof b?.availableCents === 'number');

      // Transactions (optional)
      let t: Txn[] | null = null;
      try {
        const hasTx = await endpointExists('/api/credits/transactions');
        if (hasTx) {
          const res = await fetch(
            `/api/credits/transactions?userId=${encodeURIComponent(userId)}&projectId=${encodeURIComponent(projectId)}&role=creator`
          );
          if (res.ok) {
            const data = await safeJson<TransactionsResponse>(res);
            t = data?.items ?? null;
          }
        }
      } catch (e: any) {
        setTxnError('Could not load transactions.');
      }

      if (!cancelled) {
        setBalance(b);
        setTxns(t);
        setIsCreator(inferredCreator);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, projectId]);

  const stats = useMemo(() => {
    return [
      {
        key: 'available',
        label: 'Available',
        value: formatMoney(balance?.availableCents, currency),
        sub: 'Ready to withdraw',
      },
      {
        key: 'pending',
        label: 'Pending',
        value: formatMoney(balance?.pendingCents, currency),
        sub: 'Clearing/escrow',
      },
      {
        key: 'l30',
        label: 'Last 30 days',
        value: formatMoney(balance?.last30DaysCents, currency),
        sub: 'Recent period',
      },
      {
        key: 'lifetime',
        label: 'Lifetime',
        value: formatMoney(balance?.totalEarnedCents, currency),
        sub: 'Total gross',
      },
    ];
  }, [balance, currency]);

  const miniBars = useMemo(() => {
    // simple bar chart using just divs (no libs)
    const values = [
      balance?.pendingCents ?? 0,
      balance?.availableCents ?? 0,
      balance?.last30DaysCents ?? 0,
      balance?.totalEarnedCents ?? 0,
    ];
    const max = Math.max(1, ...values);
    const norm = values.map(v => (100 * v) / max);
    const labels = ['Pending', 'Avail', '30d', 'Life'];
    return { norm, labels, raw: values };
  }, [balance]);

  async function requestPayout() {
    setPayoutMsg(null);
    setPayoutBusy(true);
    try {
      const hasPayout = await endpointExists('/api/credits/payout');
      if (!hasPayout) {
        setPayoutMsg('Payout endpoint not available. Contact support.');
      } else {
        const res = await fetch('/api/credits/payout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userId, projectId }),
        });
        if (res.ok) {
          setPayoutMsg('Payout request submitted!');
        } else {
          const err = await safeJson<{ error?: string }>(res);
          setPayoutMsg(err?.error ?? 'Payout request failed.');
        }
      }
    } catch {
      setPayoutMsg('Payout request failed.');
    } finally {
      setPayoutBusy(false);
    }
  }

  // Not logged in or no context — don’t show anything.
  if (!userId || !projectId) return null;

  // Still checking
  if (loading && isCreator == null) {
    return null;
  }

  // Viewer isn’t a creator — render nothing (no floating button)
  if (!isCreator) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-black text-white px-4 py-2 shadow-lg hover:opacity-90 transition"
        aria-label="Open Creator Dashboard"
      >
        Creator Dashboard
      </button>

      {/* Slide-over panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold">Creator Dashboard</h2>
                <p className="text-xs text-gray-500">
                  Project: <span className="font-mono">{projectId}</span>
                </p>
                <p className="text-xs text-gray-500">
                  User: <span className="font-mono">{userId}</span>
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
                aria-label="Close"
              >
                Close
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Balances / Stats */}
              <section>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Overview</h3>
                <div className="grid grid-cols-2 gap-3">
                  {stats.map(card => (
                    <div key={card.key} className="rounded-xl border p-3">
                      <div className="text-xs text-gray-500">{card.label}</div>
                      <div className="text-xl font-semibold">{card.value}</div>
                      <div className="text-[11px] text-gray-400">{card.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Mini bars */}
                <div className="mt-4 rounded-xl border p-3">
                  <div className="text-xs text-gray-500 mb-2">Mini Chart</div>
                  <div className="flex items-end gap-3 h-24">
                    {miniBars.norm.map((h, i) => (
                      <div key={i} className="flex flex-col items-center justify-end">
                        <div
                          className="w-8 rounded-t bg-gray-900"
                          style={{ height: `${Math.max(6, h)}%` }}
                          title={`${miniBars.labels[i]}: ${formatMoney(miniBars.raw[i], currency)}`}
                        />
                        <div className="text-[10px] text-gray-500 mt-1">{miniBars.labels[i]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Payout */}
              <section>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Payout</h3>
                <div className="rounded-xl border p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500">Withdrawable</div>
                    <div className="text-lg font-semibold">
                      {formatMoney(balance?.availableCents, currency)}
                    </div>
                  </div>
                  <button
                    onClick={requestPayout}
                    disabled={payoutBusy || (balance?.availableCents ?? 0) <= 0}
                    className="rounded-md bg-black text-white px-3 py-2 text-sm disabled:opacity-40"
                  >
                    {payoutBusy ? 'Submitting…' : 'Request Payout'}
                  </button>
                </div>
                {payoutMsg && (
                  <p className="text-xs mt-2 text-gray-600">{payoutMsg}</p>
                )}
              </section>

              {/* Transactions (optional) */}
              {txns && (
                <section>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Transactions</h3>
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="text-left px-3 py-2">Date</th>
                          <th className="text-left px-3 py-2">Type</th>
                          <th className="text-left px-3 py-2">Amount</th>
                          <th className="text-left px-3 py-2">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txns.map(t => (
                          <tr key={t.id} className="border-t">
                            <td className="px-3 py-2">{new Date(t.createdAt).toLocaleString()}</td>
                            <td className="px-3 py-2 capitalize">{t.type}</td>
                            <td className="px-3 py-2 font-mono">
                              {formatMoney(t.amountCents, currency)}
                            </td>
                            <td className="px-3 py-2 text-gray-600">{t.note ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              {txnError && (
                <p className="text-xs text-red-600">{txnError}</p>
              )}

              {/* Help */}
              <section className="text-[11px] text-gray-500">
                This dashboard auto-detects your creator status. If you expected to see data here,
                confirm your account is marked as a creator and that the required API routes are enabled.
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
