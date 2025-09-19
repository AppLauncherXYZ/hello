import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Same fallback domain style you already use:
const PARENT_BASE =
  process.env.PARENT_API_BASE ||
  process.env.NEXT_PUBLIC_PARENT_API_BASE ||
  'https://applauncher.xyz';

function tidy(b: string) { return b.replace(/\/+$/, ''); }
function ids(req: NextRequest) {
  const q = new URL(req.url).searchParams;
  const userId = (q.get('userId') || q.get('user_id') || q.get('uid') || '').trim();
  const projectId = (q.get('projectId') || q.get('project_id') || '').trim();
  return { userId, projectId };
}

export async function GET(req: NextRequest) {
  try {
    const { userId, projectId } = ids(req);
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Call the new parent read route — no cookies/CORS needed
    const url = new URL('/api/(derivative)/credits/balance-read', tidy(PARENT_BASE));
    url.searchParams.set('projectId', projectId);
    if (userId) url.searchParams.set('userId', userId);

    const r = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
    const text = await r.text();

    return new NextResponse(text, {
      status: r.status,
      headers: { 'content-type': r.headers.get('content-type') || 'application/json' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy failed' }, { status: 500 });
  }
}

