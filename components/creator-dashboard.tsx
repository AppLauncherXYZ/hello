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
    if (v) return v.trim();
  }
  return null;
}

function useIds() {
  const [ids, setIds] = React.useState<{ userId: string | null; projectId: string | null }>({ userId: null, projectId: null });
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
      if (!userId || !projectId) { setLoading(false); return; }
      try {
        const res = await fetch('/api/credits/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, projectId }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const b: BalanceResponse = await res.json();

        const creator =
          b?.role === 'creator' ||
          typeof b?.totalEarnedCents === 'number' ||
          typeof b?.availableCents === 'number' ||
          typeof b?.pendingCents === 'number';

        if (!cancelled) { setBalance(b || null); setIsCreator(!!creator); }
      } catch {
        if (!cancelled) { setBalance(null); setIsCreator(false); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, projectId]);

  if (!userId || !projectId) return null;
  if (loading) return null;
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
        style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 9999, padding: '10px 14px', borderRadius: 999, background: '#111', color: '#fff', border: '1px solid #000', cursor: 'pointer' }}
        aria-label="Open Creator Dashboard"
      >
        Creator Dashboard
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000 }}>
          <div style={{ position: 'absolute', right: 20, bottom: 76, width: 360, background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>Creator Summary</div>
              <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: 'transparent', border: 0, fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {cards.map((c) => (
                  <div key={c.k} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 12, color: '#777', marginBottom: 8 }}>{c.label}</div>
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

