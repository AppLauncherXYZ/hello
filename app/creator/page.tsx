// app/creator/page.tsx
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchBalance({ userId, projectId }: { userId: string; projectId: string }) {
  const qs = `?userId=${encodeURIComponent(userId)}&projectId=${encodeURIComponent(projectId)}`;
  const url = `/api/credits/balance${qs}`;

  const res = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Couldn’t load balance: HTTP ${res.status}${text ? ` — ${text}` : ''}`);
  }
  return res.json() as Promise<{ projectId: string; creditsRemaining: number; isPaid: boolean }>;
}

export default async function CreatorPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const userId = (searchParams?.userId as string) ?? '';
  const projectId = (searchParams?.projectId as string) ?? '';

  if (!userId || !projectId) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-xl font-semibold">Creator Dashboard</h1>
        <div className="mt-4 rounded-md border p-4">
          <div className="text-sm text-gray-600">
            Missing required params.
          </div>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {!userId && <li><code>userId</code> not provided</li>}
            {!projectId && <li><code>projectId</code> not provided</li>}
          </ul>
          <p className="mt-3 text-xs text-gray-500">
            Pass <code>?userId=...&projectId=...</code> to <code>/creator</code> or wire these from your session/context.
          </p>
        </div>
      </div>
    );
  }

  try {
    const data = await fetchBalance({ userId, projectId });
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-xl font-semibold">Creator Dashboard</h1>
        <div className="mt-4 rounded-md border p-4">
          <div className="text-sm text-gray-500">Project</div>
          <div className="font-medium">{data.projectId}</div>

          <div className="mt-3 text-sm text-gray-500">Credits Remaining</div>
          <div className="font-semibold">{data.creditsRemaining}</div>

          <div className="mt-3 text-sm text-gray-500">Plan</div>
          <div className="font-medium">{data.isPaid ? 'Paid' : 'Free'}</div>
        </div>
      </div>
    );
  } catch (e: any) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-xl font-semibold">Creator Dashboard</h1>
        <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {e?.message || 'Couldn’t load balance.'}
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Ensure the child proxy <code>/api/credits/balance</code> points to the parent <code>/api/credits/balance-read</code>.
        </p>
      </div>
    );
  }
}

