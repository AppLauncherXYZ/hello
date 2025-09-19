'use client';

import * as React from 'react';

type BalanceResponse = {
  role?: 'creator' | 'user' | string;
  totalEarnedCents?: number;
  availableCents?: number;
  pendingCents?: number;
  last30DaysCents?: number;
  currency?: string;
};

function getParam(sp: URLSearchParams, keys: string[]) {
  for (const k of keys) {
    const v = sp.get(k);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function useIds() {
  const [ids, setIds] = React.useState<{ userId: string | null; projectId: string | null }>({
    userId: null,
    projectId: null,
  });

  React.useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const userId = getParam(sp, ['user_id', 'userId', 'uid']);
      const projectId = getParam(sp, ['project_id', 'projectId']);
      setIds({ userId, projectId });
    } catch {
      setIds({ userId: null, projectId: null });
    }
  }, []);

  return ids;
}

function money(cents?: number, currency?: string) {
  if (typeof cents !== 'number') return '—';
  const amt = (cents / 100).toFixed(2);
  return currency ? `${currency} ${amt}` : `$${amt}`;
}

export default function CreatorDashboardLite() {
  const { userId, projectId } = useIds();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [isCreator, setIsCreator] = React.useState(false);
  const [balance, setBalance] = React.useState<BalanceResponse | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId || !projectId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/credits/balance?userId=${encodeURIComponent(userId)}&projectId=${encodeURIComponent(projectId)}`
        );
        if (!res.ok) throw new Error('balance not ok');
        const b: BalanceResponse = await res.json();

        const creator =
          b?.role === 'creator' ||
          typeof b?.totalEarnedCents === 'number' ||
          typeof b?.availableCents === 'number' ||
          typeof b?.pendingCents === 'number';

        if (!cancelled) {
          setBalance(b || null);
          setIsCreator(!!creator);
        }
      } catch {
        if (!cancelled) {
          setBalance(null);
          setIsCreator(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, projectId]);

  // No context or still checking → don’t block the app
  if (!userId || !projectId) return null;
  if (loading) return null;

  // Endpoint missing / not a creator → render nothing
  if (!isCreator || !balance) return null;

  const cards = [
    { k: 'available', label: 'Available', value: money(balance.availableCents, balance.currency) },
    { k: 'pending', label: 'Pending', value: money(balance.pendingCents, balance.currency) },
    { k: 'last30', label: 'Last 30 days', value: money(balance.last30DaysCents, balance.currency) },
    { k: 'lifetime', label: 'Lifetime', value: money(balance.totalEarnedCents, balance.currency) },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', right: 20, bottom: 20, zIndex: 9999,
          padding: '10px 14px', borderRadius: 999,
          background: '#111', color: '#fff', border: '1px solid #000', cursor: 'pointer',
        }}
        aria-label="Open Creator Dashboard"
      >
        Creator Dashboard
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>
          <div
            onClick={() => setOpen(false)}
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'absolute', top: 0, right: 0, height: '100%', width: '100%',
              maxWidth: 520, background: '#fff', boxShadow: '0 0 40px rgba(0,0,0,0.2)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: 16, borderBottom: '1px solid #eee' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Creator Dashboard</div>
                <div style={{ fontSize: 12, color: '#666' }}>Project: <code>{projectId}</code></div>
                <div style={{ fontSize: 12, color: '#666' }}>User: <code>{userId}</code></div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

            <div style={{ padding: 16, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {cards.map(c => (
                  <div key={c.k} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 12, color: '#666' }}>{c.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{c.value}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#777', marginTop: 12 }}>
                Read-only summary. Payouts & transactions can be added later without changing templates.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
