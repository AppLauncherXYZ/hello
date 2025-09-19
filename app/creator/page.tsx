// app/creator/page.tsx
import * as React from 'react';

export const dynamic = 'force-dynamic';

// Parent "credits" shape
type ParentCredits = {
  projectId?: string;
  creditsRemaining?: number;
  isPaid?: boolean;
  // may also include { error?: string }
};

// Optional future "earnings" shape
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

async function fetchCredits(projectId: string): Promise<ParentCredits | Earnings | null> {
  const url = new URL('/api/credits/balance', 'http://localhost'); // base is ignored by Next
  url.searchParams.set('projectId', projectId);

  try {
    const res = await fetch(url.toString().replace('http://localhost', ''), {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as any;
  } catch {
    return null;
  }
}

export default async function CreatorPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // Only read; do NOT display these values
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

  const data = await fetchCredits(projectId);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-3xl w-full border rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Creator Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Server-rendered overview. IDs are not shown in the UI.
        </p>

        {!data ? (
          <div className="rounded-xl border p-4">
            <p className="text-sm">
              Couldn’t load balance. Ensure the parent exposes{' '}
              <code className="font-mono">/api/credits/balance</code> and the user is authenticated on the parent domain.
            </p>
          </div>
        ) : 'creditsRemaining' in data || 'isPaid' in data ? (
          // Parent credits UI
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border rounded-xl p-4">
              <div className="text-xs text-muted-foreground">Credits Remaining</div>
              <div className="text-xl font-semibold">
                {typeof (data as ParentCredits).creditsRemaining === 'number'
                  ? (data as ParentCredits).creditsRemaining
                  : '—'}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Units available
              </div>
            </div>

            <div className="border rounded-xl p-4">
              <div className="text-xs text-muted-foreground">Plan Status</div>
              <div className="text-xl font-semibold">
                {(data as ParentCredits).isPaid ? 'Paid' : 'Free'}
              </div>
              <div className="text-[11px] text-muted-foreground">
                From parent session
              </div>
            </div>

            <div className="border rounded-xl p-4">
              <div className="text-xs text-muted-foreground">Project</div>
              <div className="text-xl font-semibold">
                {(data as ParentCredits).projectId ? 'Active' : '—'}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Hidden identifier
              </div>
            </div>
          </div>
        ) : (
          // Optional earnings UI if the parent returns cents fields now or later
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
