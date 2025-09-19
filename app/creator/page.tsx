'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function norm(v?: string | null) { return (v ?? '').trim(); }
function extractIds(sp: URLSearchParams) {
  const userId =
    norm(sp.get('user_id')) ||
    norm(sp.get('userId')) ||
    norm(sp.get('uid'));
  const projectId =
    norm(sp.get('project_id')) ||
    norm(sp.get('projectId'));
  return { userId, projectId };
}

export default function CreatorPage() {
  const sp = useSearchParams();
  const { userId, projectId } = extractIds(sp);

  const [data, setData] = useState<null | { projectId: string; creditsRemaining: number; isPaid: boolean }>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBalance() {
      try {
        setError(null);
        if (!userId || !projectId) {
          setError('Missing userId/projectId');
          setLoading(false);
          return;
        }
        const res = await fetch('/api/credits/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, projectId }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(()=>'')}`);
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e?.message || 'Couldn’t load balance.');
      } finally {
        setLoading(false);
      }
    }
    loadBalance();
  }, [userId, projectId]);

  if (loading) return <p className="p-6">Loading…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-xl font-semibold">Creator Dashboard</h1>
      <div className="mt-4 rounded-md border p-4">
        <div className="text-sm text-gray-500">Project</div>
        <div className="font-medium">{data?.projectId}</div>

        <div className="mt-3 text-sm text-gray-500">Credits Remaining</div>
        <div className="font-semibold">{data?.creditsRemaining}</div>

        <div className="mt-3 text-sm text-gray-500">Plan</div>
        <div className="font-medium">{data?.isPaid ? 'Paid' : 'Free'}</div>
      </div>
    </div>
  );
}

