'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

type Txn = {
  id: string;
  amount: number;            // cents
  status: 'pending' | 'completed' | 'failed' | string;
  description?: string | null;
  createdAt: string;         // ISO
  currency?: string | null;
  metadata?: Record<string, any> | null;
  projectId?: string | null;
  userId?: string | null;
};

type TxnResponse = {
  ok?: boolean;
  currency?: string;
  totalEarnedCents?: number;
  transactions?: Txn[];
  error?: string;
};

function money(cents?: number | null, currency = 'USD') {
  if (typeof cents !== 'number') return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
}

export default function CreatorDashboard() {
  const sp = useSearchParams();
  const userId = sp.get('userId') || sp.get('user_id') || '';
  const projectId = sp.get('projectId') || sp.get('project_id') || '';

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [txns, setTxns] = React.useState<Txn[]>([]);
  const [currency, setCurrency] = React.useState<string>('USD');
  const [totalEarnedCents, setTotalEarnedCents] = React.useState<number>(0);
  const [forbidden, setForbidden] = React.useState(false);
  const [unauthorized, setUnauthorized] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId || !projectId) {
        setError('Missing userId or projectId in URL.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setForbidden(false);
      setUnauthorized(false);

      try {
        const res = await fetch(
          `/api/credits/transactions?userId=${encodeURIComponent(userId)}&projectId=${encodeURIComponent(projectId)}`,
          { cache: 'no-store' }
        );

        if (res.status === 401) { if (!cancelled) setUnauthorized(true); }
        if (res.status === 403) { if (!cancelled) setForbidden(true); }

        const data: TxnResponse = await res.json().catch(() => ({ error: 'Invalid JSON' }));
        if (cancelled) return;

        if (!res.ok) {
          setError(data?.error || `Request failed (${res.status})`);
          setLoading(false);
          return;
        }

        const list = Array.isArray(data.transactions) ? data.transactions : [];
        const cur = data.currency || list.find(t => !!t.currency)?.currency || 'USD';
        // Fall back to computing total from rows if parent didn't send it
        const computedTotal =
          typeof data.totalEarnedCents === 'number'
            ? data.totalEarnedCents
            : list.reduce((sum, t) => (t.amount > 0 && t.status === 'completed' ? sum + t.amount : sum), 0);

        setTxns(list);
        setCurrency(cur);
        setTotalEarnedCents(computedTotal);
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError('Network error');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [userId, projectId]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Creator Dashboard</h1>

      {unauthorized && (
        <div style={{ marginBottom: 12, padding: 12, border: '1px solid #f0c', borderRadius: 8 }}>
          Please sign in on the parent domain to view creator transactions.
        </div>
      )}
      {forbidden && (
        <div style={{ marginBottom: 12, padding: 12, border: '1px solid #f99', borderRadius: 8 }}>
          Only the project owner can view these transactions.
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 12, padding: 12, border: '1px solid #f99', borderRadius: 8 }}>
          {error}
        </div>
      )}

      {/* Summary cards (Total only) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, color: '#777' }}>Total earned</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{money(totalEarnedCents, currency)}</div>
        </div>
      </div>

      {/* Transactions table */}
      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>All Transactions</h3>
        {loading ? (
          <div>Loading…</div>
        ) : txns.length === 0 ? (
          <div style={{ fontSize: 14, color: '#777' }}>No transactions yet.</div>
        ) : (
          <div style={{ overflow: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ textAlign: 'left', padding: 10 }}>Date</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Description</th>
                  <th style={{ textAlign: 'right', padding: 10 }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: 10 }}>{new Date(t.createdAt).toLocaleString()}</td>
                    <td style={{ padding: 10 }}>{t.description || '—'}</td>
                    <td style={{ padding: 10, textAlign: 'right' }}>{money(t.amount, t.currency || currency)}</td>
                    <td style={{ padding: 10 }}>{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

