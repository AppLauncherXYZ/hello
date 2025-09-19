// app/creator/page.tsx
import * as React from 'react';

type BalanceResponse = {
  role?: 'creator' | 'user' | string;
  totalEarnedCents?: number;
  availableCents?: number;
  pendingCents?: number;
  last30DaysCents?: number;
  currency?: string; // e.g. 'USD'
};

function norm(v: unknown) {
  if (Array.isArray(v)) v = v[0];
  return typeof v === 'string' ? v.trim() : '';
}

function formatMoney(cents?: number, currency?: string) {
  if (typeof cents !== 'number') return '—';
  const amount = (cents / 100).toFixed(2);
  return currency ? `${currency} ${amount}` : `$${amount}`;
}

// If parent runs on a different origin, set one of these in the child app:
//  - PARENT_API_BASE
//  - NEXT_PUBLIC_PARENT_BASE_URL
function parentBase() {
  const env =
    process.env.PARENT_API_BASE ||
    process.env.NEXT_PUBLIC_PARENT_BASE_URL ||
    '';
  return env.replace(/\/$/, ''); // trim trailing slash
}

async function getBalance(userId: string, projectId: string): Promise<BalanceResponse | null> {
  const base = parentBase();
  const url = `${base}/api/credits/balance?userId=${encodeURIComponent(
    userId
  )}&projectId=${encodeURIComponent(projectId)}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as BalanceResponse;
    return data ?? null;
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic'; // don’t cache this page
export default async function CreatorPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // Read IDs from query but DO NOT render them in the UI
  const userId =
    norm(searchParams['user_id']) ||
    norm(searchParams['userId']) ||
    norm(searchParams['uid']);
  const projectId =
    norm(searchParams['project_id']) || norm(searchParams['projectId']);

  if (!userId || !projectId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl w-full border rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl font-semibold mb-2">Creator Dashboard</h1>
          <p className="text-sm text-red-600">
            Not authorized — missing required context.
          </p>
          <div className="mt-4">
            <a href="/" className="text-sm underline">
              ← Back to app
            </a>
          </div>
        </div>
      </main>
    );
  }

  const balance = await getBalance(userId, projectId);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-3xl w-full border rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Creator Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Earnings overview (server-rendered). IDs are not displayed.
        </p>

        {!balance ? (
          <div className="rounded-xl border p-4">
            <p className="text-sm">
              Couldn’t load earnings. Make sure the parent exposes{' '}
              <code className="font-mono">/api/credits/balance</code> and, if
              the parent is on another domain, set{' '}
              <code className="font-mono">PARENT_API_BASE</code> or{' '}
              <code className="font-mono">NEXT_PUBLIC_PARENT_BASE_URL</code> in
              this app.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="border rounded-xl p-4">
                <div className="text-xs text-muted-foreground">Available</div>
                <div className="text-xl font-semibold">
                  {formatMoney(balance.availableCents, balance.currency)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Ready to withdraw
                </div>
              </div>

              <div className="border rounded-xl p-4">
                <div className="text-xs text-muted-foreground">Pending</div>
                <div className="text-xl font-semibold">
                  {formatMoney(balance.pendingCents, balance.currency)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Clearing / escrow
                </div>
              </div>

              <div className="border rounded-xl p-4">
                <div className="text-xs text-muted-foreground">Last 30 days</div>
                <div className="text-xl font-semibold">
                  {formatMoney(balance.last30DaysCents, balance.currency)}
                </div>
                <div className="text-[11px] text-muted-foreground">Recent</div>
              </div>

              <div className="border rounded-xl p-4">
                <div className="text-xs text-muted-foreground">Lifetime</div>
                <div className="text-xl font-semibold">
                  {formatMoney(balance.totalEarnedCents, balance.currency)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Total gross
                </div>
              </div>
            </div>

            {/* Minimal bar viz without extra deps */}
            <div className="mt-6 border rounded-xl p-4">
              <div className="text-xs text-muted-foreground mb-2">Mini Chart</div>
              <div className="flex items-end gap-3 h-24">
                {[
                  { label: 'Pending', v: balance.pendingCents ?? 0 },
                  { label: 'Avail', v: balance.availableCents ?? 0 },
                  { label: '30d', v: balance.last30DaysCents ?? 0 },
                  { label: 'Life', v: balance.totalEarnedCents ?? 0 },
                ].map((b, i, arr) => {
                  const max = Math.max(1, ...arr.map((x) => x.v));
                  const h = Math.max(6, (100 * b.v) / max);
                  return (
                    <div key={b.label} className="flex flex-col items-center justify-end">
                      <div
                        className="w-8 rounded-t bg-foreground"
                        style={{ height: `${h}%` }}
                        title={`${b.label}: ${formatMoney(
                          b.v,
                          balance.currency
                        )}`}
                      />
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {b.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className="mt-6">
          <a href="/" className="text-sm underline">
            ← Back to app
          </a>
        </div>
      </div>
    </main>
  );
}
