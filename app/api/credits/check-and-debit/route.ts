import { NextRequest, NextResponse } from 'next/server';

// Prefer server env var; fall back to NEXT_PUBLIC or hardcoded domain
const PARENT_BASE =
  process.env.PARENT_API_BASE ||
  process.env.NEXT_PUBLIC_PARENT_API_BASE ||
  'https://applauncher.xyz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId, user_id, projectId, project_id, cost, metadata } = await req.json();

    const uid = userId ?? user_id;
    const pid = projectId ?? project_id;

    if (!uid || !pid || !Number.isInteger(cost) || cost <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
    }

    const r = await fetch(`${PARENT_BASE}/api/credits/check-and-debit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: uid,
        projectId: pid,
        cost,
        metadata: metadata ?? {},
      }),
    });

    const text = await r.text();
    // Pass through JSON exactly
    return new NextResponse(text, {
      status: r.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('generated-proxy check-and-debit error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Proxy failed' }, { status: 500 });
  }
}

