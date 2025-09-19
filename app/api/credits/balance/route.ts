import { NextResponse } from 'next/server';

const RAW_BASE = process.env.PARENT_BASE_URL ?? 'https://applauncher.xyz';
// Normalize: remove trailing slashes and a trailing "/api" if someone set it
const PARENT_BASE_URL = RAW_BASE.replace(/\/+$/, '').replace(/\/api$/, '');
const PARENT_BALANCE_READ = `${PARENT_BASE_URL}/api/credits/balance-read`;

export const runtime = 'nodejs';

const BAD = /…|^\s*$|undefined|null/i;       // block ellipsis/empty/undefined/null
const LOOKS_OK = /^[A-Za-z0-9._-]{4,}$/;     // adjust if your IDs have a stricter format

export async function POST(req: Request) {
  try {
    const { userId, projectId } = await req.json();

    if (!userId || !projectId || BAD.test(userId) || BAD.test(projectId) || !LOOKS_OK.test(userId) || !LOOKS_OK.test(projectId)) {
      return NextResponse.json({ error: 'Invalid userId/projectId' }, { status: 400 });
    }

    const url = `${PARENT_BALANCE_READ}?userId=${encodeURIComponent(userId)}&projectId=${encodeURIComponent(projectId)}`;

    const upstream = await fetch(url, { method: 'GET', cache: 'no-store' });

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => '');
      console.error(`balance-read ${upstream.status} @ ${url} :: ${body.slice(0, 200)}`);
      return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: upstream.status });
    }

    const data = await upstream.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('Proxy /api/credits/balance error:', err);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
}

