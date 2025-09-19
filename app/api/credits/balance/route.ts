import { NextResponse } from 'next/server';

const PARENT_BASE_URL =
  process.env.PARENT_BASE_URL ?? 'https://applauncher.xyz';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { userId, projectId } = await req.json();
    if (!userId || !projectId) {
      return NextResponse.json({ error: 'Missing userId or projectId' }, { status: 400 });
    }

    // Parent currently expects GET. Keep IDs off the browser URL;
    // they are only used server-to-server here.
    const url = `${PARENT_BASE_URL}/api/credits/balance-read` +
      `?userId=${encodeURIComponent(userId)}&projectId=${encodeURIComponent(projectId)}`;

    const res = await fetch(url, { method: 'GET', cache: 'no-store' });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Upstream error ${res.status}`, details: text || undefined },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('Proxy /api/credits/balance error:', err);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
}

