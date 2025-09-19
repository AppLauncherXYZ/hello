// app/api/credits/balance/route.ts
import { NextResponse } from 'next/server';

const PARENT_BASE_URL =
  process.env.PARENT_BASE_URL ??
  process.env.NEXT_PUBLIC_PARENT_BASE_URL ??
  'https://applauncher.xyz';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const projectId = searchParams.get('projectId');

  if (!userId || !projectId) {
    return NextResponse.json(
      { error: 'Missing userId or projectId' },
      { status: 400 },
    );
  }

  const parentUrl = `${PARENT_BASE_URL}/api/credits/balance-read?userId=${encodeURIComponent(
    userId,
  )}&projectId=${encodeURIComponent(projectId)}`;

  try {
    const res = await fetch(parentUrl, {
      method: 'GET',
      // No credentials; this endpoint intentionally does NOT require cookies
      cache: 'no-store',
      // If you’re on Vercel and this occasionally lands on Edge, force Node:
      // next: { revalidate: 0 }
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(
        `Proxy /api/credits/balance → ${parentUrl} failed: ${res.status} ${text}`,
      );
      return NextResponse.json(
        { error: `Upstream error ${res.status}`, details: text || undefined },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error('Proxy /api/credits/balance error:', err);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
}

