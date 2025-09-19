// app/creator/page.tsx
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic'; // ensure fresh
export const revalidate = 0;

async function fetchBalance({ userId, projectId }: { userId: string; projectId: string }) {
  const url = `${process.env.NEXT_PUBLIC_APP_BASE_URL ?? ''}/api/credits/balance?userId=${encodeURIComponent(
    userId,
  )}&projectId=${encodeURIComponent(projectId)}`;

  // If NEXT_PUBLIC_APP_BASE_URL is not set, relative fetch still works in SSR
  const res = await fetch(url.startsWith('http') ? url : `/api/credits/balance?userId=${encodeURIComponent(userId)}&projectId=${encodeURIComponent(projectId)}`, {
    method: 'GET',
    cache: 'no-store',
  });

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
  // However you already source these:
  const userId = (searchParams?.userId as string) ?? '';
  const projectId = (searchParams?.projectId as string) ?? '';

  if (!userId || !projectId) notFound();

  let data: Awaited<ReturnType<typeof fetchBalance>>;
  try {
    data = await fetchBalance({ userId, projectId });
  } catch (e: any) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-xl font-semibold">Creator Dashboard</h1>
        <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {e?.message || 'Couldn’t load balance.'}
        </p>
      </div>
    );
  }

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
}

