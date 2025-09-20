import { NextResponse } from 'next/server';

const RAW_BASE = process.env.PARENT_BASE_URL ?? 'https://applauncher.xyz';
// normalize: strip trailing slashes and optional /api
const PARENT_BASE_URL = RAW_BASE.replace(/\/+$/, '').replace(/\/api$/, '');

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const userId = u.searchParams.get('userId') || u.searchParams.get('user_id');
    const projectId = u.searchParams.get('projectId') || u.searchParams.get('project_id');
    if (!userId || !projectId) {
      return NextResponse.json({ error: 'Missing userId or projectId' }, { status: 400 });
    }

    // Forward to parent. Parent must enforce creator-only access.
    const upstreamUrl =
      `${PARENT_BASE_URL}/api/credits/transactions` +
      `?userId=${encodeURIComponent(userId)}` +
      `&projectId=${encodeURIComponent(projectId)}` +
      `&all=true`;

    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });

    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Proxy /api/credits/transactions error:', e);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
}

