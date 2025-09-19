// app/api/credits/balance/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BalanceResponse = {
  role?: 'creator' | 'user' | string;
  totalEarnedCents?: number;
  availableCents?: number;
  pendingCents?: number;
  last30DaysCents?: number;
  currency?: string;
};

function norm(v: unknown) {
  if (Array.isArray(v)) v = v[0];
  return typeof v === 'string' ? v.trim() : '';
}

function getIds(sp: URLSearchParams) {
  const userId =
    norm(sp.get('userId')) || norm(sp.get('user_id')) || norm(sp.get('uid'));
  const projectId =
    norm(sp.get('projectId')) || norm(sp.get('project_id'));
  return { userId, projectId };
}

function parentBase(): string {
  const base =
    process.env.PARENT_API_BASE ||
    process.env.NEXT_PUBLIC_PARENT_API_BASE ||
    process.env.NEXT_PUBLIC_PARENT_BASE_URL ||
    '';
  return base.replace(/\/$/, '');
}

export async function HEAD() {
  // Lightweight existence/health check for clients that probe with HEAD.
  return new NextResponse(null, { status: 204 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const { userId, projectId } = getIds(searchParams);

  if (!userId || !projectId) {
    return NextResponse.json(
      { ok: false, error: 'Missing userId or projectId' },
      { status: 400 }
    );
  }

  // Dev/mock mode (optional): return fake numbers without touching the parent.
  if (process.env.MOCK_BALANCE === '1') {
    const mock: BalanceResponse = {
      role: 'creator',
      totalEarnedCents: 125_400,
      availableCents: 8_900,
      pendingCents: 2_300,
      last30DaysCents: 19_500,
      currency: 'USD',
    };
    return NextResponse.json(mock, { status: 200 });
  }

  const base = parentBase();
  if (!base) {
    return NextResponse.json(
      { ok: false, error: 'Parent base not configured (set PARENT_API_BASE or NEXT_PUBLIC_PARENT_BASE_URL)' },
      { status: 501 }
    );
  }

  const url = `${base}/api/credits/balance?userId=${encodeURIComponent(
    userId
  )}&projectId=${encodeURIComponent(projectId)}`;

  try {
    const r = await fetch(url, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        // Optional: pass-through info for parent observability
        'x-child-origin': req.headers.get('origin') || '',
        'x-child-host': req.headers.get('host') || '',
      },
      cache: 'no-store',
    });

    const text = await r.text(); // pass through as-is
    return new NextResponse(text, {
      status: r.status,
      headers: { 'content-type': r.headers.get('content-type') || 'application/json' },
    });
  } catch (e: any) {
    console.error('[credits/balance] proxy error:', e);
    return NextResponse.json(
      { ok: false, error: 'Proxy to parent failed' },
      { status: 502 }
    );
  }
}

