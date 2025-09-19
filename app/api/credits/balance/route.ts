// app/api/credits/balance/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PARENT_BASE =
  process.env.PARENT_API_BASE ||
  process.env.NEXT_PUBLIC_PARENT_API_BASE ||
  'https://applauncher.xyz';

function tidyBase(b: string) {
  return b.replace(/\/+$/, '');
}

function extractProjectId(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams;
  // Parent requires projectId; we accept legacy keys but send projectId upstream
  const projectId =
    (q.get('projectId') ||
      q.get('project_id') ||
      '')!.trim();
  return projectId;
}

export async function HEAD() {
  // health check for clients that probe endpoints
  return new NextResponse(null, { status: 204 });
}

export async function GET(req: NextRequest) {
  try {
    const projectId = extractProjectId(req);
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const parentUrl = new URL('/api/credits/balance', tidyBase(PARENT_BASE));
    parentUrl.searchParams.set('projectId', projectId);

    // timebox to avoid hanging builds
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8000);

    const headers: Record<string, string> = {};
    const auth = req.headers.get('authorization');
    const cookie = req.headers.get('cookie');
    if (auth) headers['authorization'] = auth;
    if (cookie) headers['cookie'] = cookie;

    const r = await fetch(parentUrl.toString(), {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: ac.signal,
    }).finally(() => clearTimeout(t));

    const text = await r.text();
    const contentType = r.headers.get('content-type') || 'application/json';

    return new NextResponse(text, {
      status: r.status,
      headers: { 'content-type': contentType },
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Upstream timeout' },
        { status: 504 }
      );
    }
    console.error('proxy /api/credits/balance error:', err);
    return NextResponse.json(
      { error: err?.message || 'Proxy failed' },
      { status: 500 }
    );
  }
}
