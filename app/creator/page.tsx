// app/creator/page.tsx
export const dynamic = 'force-dynamic';

type ParentCredits = {
  projectId?: string;
  creditsRemaining?: number;
  isPaid?: boolean;
  error?: string;
};

type Earnings = {
  role?: 'creator' | 'user' | string;
  totalEarnedCents?: number;
  availableCents?: number;
  pendingCents?: number;
  last30DaysCents?: number;
  currency?: string;
};

function norm(v: unknown) {
  if (Array.isArray(v)) v = v[0];
  return typeof v === 'string' ? v.trim() : '';
}

function money(cents?: number, currency?: string) {
  if (typeof cents !== 'number') return '—';
  const amt = (cents / 100).toFixed(2);
  return currency ? `${currency} ${amt}` : `$${amt}`;
}

async function fetchBalance(projectId: string, userId?: string) {
  // Build a relative URL so Next routes to the child proxy
  let url = `/api/credits/balance?projectId=${encodeURIComponent(projectId)}`;
  if (userId) url += `&userId=${encodeURIComponent(userId)}`;

  // Timebox the upstream call so this page never hangs
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: ac.signal });
    const text = await res.text();
    if (!res.ok) {
      // Try to surface a meaningful error from the proxy/parent
      try {
        const j = JSON.parse(text);
        throw new Error(j?.error || `HTTP ${res.status}`);
      } catch {
        throw new Error(`HTTP ${res.status}`);
      }
    }
    return JSON.parse(text) as ParentCredits | Earnings;
  } catch (e) {
    return { error: (e as Error).message } as ParentCredits;
  } finally {
    clearTimeout(timer);
  }
}

export default async function CreatorPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // Read (but never render) identifiers from query
  const userId =
    norm(searchParams['userId']) ||
    norm(searchParams['user_id']) ||
    norm(searchParams['uid']);
  const projectId =
    norm(searchParams['projectId']) || norm(searchParams['project_id']);

  if (!projectId) {
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

  const data = await fetchBalance(projectId, userId);
  const errorText = (data as ParentCredits)?.error;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-3xl w-full border rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Creator Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Server-rendered overview. Identifiers are not shown in the UI.
        </p>

        {errorText ? (
          <div className="rounded-xl border p-4">
            <p className="text-sm text-red-600">Couldn’t load balance: {errorText}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ensure the parent exposes <code className="font-mono">/api/credits/balance-read</code> (or equivalent),
              and that the child proxy <code className="font-mono">/api/credits/balance</code> points to it.
            </p>
          </div>
        ) : data && ('creditsRemaining' in data || 'isPaid' in data) ? (
          // Parent credits UI (current parent contract)
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border rounded-xl p-4">
              <div className="text-xs text-muted-foreground">Credits Remaining</div>
              <div className="text-xl font-semibold">
                {(data as ParentCredits).creditsRemaining ?? '—'}
              </div>
              <div className="text-[11px] text-muted-foreground">Units available</div>
            </div>
            <div className="border rounded-xl p-4">
              <div className="text-xs text-muted-foreground">Plan Status</div>
              <div className="text-xl font-semibold">
                {(data as ParentCredits).isPaid ? 'Paid' : 'Free'}
              </div>
              <div className="text-[11px] text-muted-foreground">From parent session/data</div>
            </div>
            <div className="border rounded-xl p-4">
              <div className="text-xs text-muted-foreground">Project</div>
              <div className="text-xl font-semibold">
                {(data as ParentCredits).projectId ? 'Active' : '—'}
              </div>
              <div className="text-[11px] text-muted-foreground">Hidden identifier</div>
            </div>
          </div>
        ) : data ? (
          // Optional earnings UI if parent returns cents fields now or later
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="border rounded-xl p-4">
                <div className="text-xs text-muted-foreground">Available</div>
                <div className="text-xl font-semibold">
                  {money((data as Earnings).availableCents, (data as Earnings).currency)}
                </div>
                <div className="text-[11px] text-muted-foreground">Ready to withdraw</div>
              </div>
              <div className="border rounded-xl p-4">
                <div className="text-xs text-muted-foreground">Pending</div>
                <div className="text-xl font-semibold">
                  {money((data as Earnings).pendingCents, (data as Earnings).currency)}
                </div>
                <div className="text-[11px] text-muted-foreground">Clearing / escrow</div>
              </div>
              <div className="border rounded-xl p-4">
                <div className="text-xs text-muted-foreground">Last 30 days</div>
                <div className="text-xl font-semibold">
                  {money((data as Earnings).last30DaysCents, (data as Earnings).currency)}
                </div>
                <div className="text-[11px] text-muted-foreground">Recent</div>
              </div>
              <div className="border rounded-xl p-4">
                <div className="text-xs text-muted-foreground">Lifetime</div>
                <div className="text-xl font-semibold">
                  {money((data as Earnings).totalEarnedCents, (data as Earnings).currency)}
                </div>
                <div className="text-[11px] text-muted-foreground">Total gross</div>
              </div>
            </div>

            <div className="mt-6 border rounded-xl p-4">
              <div className="text-xs text-muted-foreground mb-2">Mini Chart</div>
              <div className="flex items-end gap-3 h-24">
                {[
                  { label: 'Pending', v: (data as Earnings).pendingCents ?? 0 },
                  { label: 'Avail', v: (data as Earnings).availableCents ?? 0 },
                  { label: '30d', v: (data as Earnings).last30DaysCents ?? 0 },
                  { label: 'Life', v: (data as Earnings).totalEarnedCents ?? 0 },
                ].map((b, i, arr) => {
                  const max = Math.max(1, ...arr.map((x) => x.v ?? 0));
                  const h = Math.max(6, (100 * (b.v ?? 0)) / max);
                  return (
                    <div key={b.label} className="flex flex-col items-center justify-end">
                      <div className="w-8 rounded-t bg-foreground" style={{ height: `${h}%` }} />
                      <div className="text-[10px] text-muted-foreground mt-1">{b.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border p-4">
            <p className="text-sm">
              Couldn’t load balance. Ensure the parent exposes a compatible endpoint and the child
              proxy <code className="font-mono">/api/credits/balance</code> is configured to reach it.
            </p>
          </div>
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

