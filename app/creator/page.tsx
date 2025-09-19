// app/creator/page.tsx
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

function norm(v?: string | null) {
  return (v ?? '').trim();
}

export default function CreatorPage() {
  const sp = useSearchParams();
  const userId =
    norm(sp.get('user_id')) || norm(sp.get('userId')) || norm(sp.get('uid'));
  const projectId = norm(sp.get('project_id')) || norm(sp.get('projectId'));

  const ok = !!userId && !!projectId;

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          border: '1px solid #eee',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          Creator Dashboard (POC)
        </h1>
        <p style={{ color: '#666', marginBottom: 20 }}>
          This page proves the Creator Admin tab routes correctly inside the generated app.
          No endpoints are called here.
        </p>

        {ok ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 12, color: '#666' }}>User</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{userId}</div>
              </div>
              <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 12, color: '#666' }}>Project</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{projectId}</div>
              </div>
            </div>

            <p style={{ fontSize: 14, color: '#555' }}>
              ✅ Access check passed. You can now wire this to real earnings endpoints later.
            </p>
          </>
        ) : (
          <p style={{ color: '#b91c1c', fontWeight: 600 }}>
            Not authorized — missing <code>userId</code> and/or <code>projectId</code> in the URL.
          </p>
        )}

        <div style={{ marginTop: 20 }}>
          <a href="/" style={{ fontSize: 14, textDecoration: 'underline' }}>
            ← Back to app
          </a>
        </div>
      </div>
    </main>
  );
}

