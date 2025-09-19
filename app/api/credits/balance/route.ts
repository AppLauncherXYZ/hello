import { NextRequest, NextResponse } from 'next/server';
  
  export const runtime = 'nodejs';
  export const dynamic = 'force-dynamic';
  
  function parentBase() {
    const base = process.env.NEXT_PUBLIC_PARENT_API_BASE || 'https://applauncher.xyz';
    return base.replace(/\/+$/, '');
  }
  function extractIds(req: NextRequest) {
    const url = new URL(req.url);
    const q = url.searchParams;
    const user = q.get('user_id') || q.get('userId') || q.get('uid');
    const project = q.get('project_id') || q.get('projectId');
    return { user, project };
  }
  
  export async function GET(req: NextRequest) {
    try {
      const { user, project } = extractIds(req);
      if (!user || !project) {
        return NextResponse.json({ ok: false, error: 'Missing user_id and/or project_id' }, { status: 400 });
      }
  
      const parentUrl = new URL('/api/credits/balance', parentBase());
      parentUrl.searchParams.set('user_id', String(user));
      parentUrl.searchParams.set('project_id', String(project));
  
      const r = await fetch(parentUrl.toString(), {
        method: 'GET',
        headers: {
          'authorization': req.headers.get('authorization') ?? '',
          'cookie': req.headers.get('cookie') ?? '',
        },
      });
  
      const text = await r.text();
      return new NextResponse(text, { status: r.status, headers: { 'Content-Type': 'application/json' } });
    } catch (err: any) {
      console.error('proxy /api/credits/balance error:', err);
      return NextResponse.json({ ok: false, error: err?.message || 'Proxy failed' }, { status: 500 });
    }
  }
