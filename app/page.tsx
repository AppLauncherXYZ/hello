'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

function norm(v?: string | null) {
  return (v ?? '').trim()
}
function extractIds(params: URLSearchParams) {
  const user_id =
    norm(params.get('user_id')) ||
    norm(params.get('userId')) ||
    norm(params.get('uid'))
  const project_id =
    norm(params.get('project_id')) ||
    norm(params.get('projectId'))
  return { user_id, project_id }
}

/** Iframe-safe popup: try anchor click (more permissive in iframes), then window.open */
function openPopupSafely(url: string): boolean {
  try {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    a.remove()
    return true
  } catch {}
  const w = window.open(url, '_blank', 'noopener')
  return !!w
}

export default function Page() {
  const params = useSearchParams()
  const { user_id, project_id } = React.useMemo(() => extractIds(params), [params])

  // Build /creator link with same query string
  const creatorHref = React.useMemo(() => {
    const qs = params.toString()
    return `/creator${qs ? `?${qs}` : ''}`
  }, [params])

  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [blockedUrl, setBlockedUrl] = React.useState<string | null>(null)

  const subscribe = async () => {
    setError(null)
    if (!user_id || !project_id) {
      setError('Unable to start checkout in this context.')
      return
    }
    setBusy(true)
    try {
      const productName = 'Pro Monthly ($9.99)'
      const priceCents = 999

      // Legacy-friendly mirrors for maximum parent compatibility
      const type = 'subscription' as const
      const tier = 'pro-monthly'
      const amount = priceCents / 100 // dollars

      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          priceCents,
          user_id,
          project_id,
          type,
          tier,
          amount,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || data?.message || 'Checkout failed')
        return
      }

      const url = data?.url || data?.checkoutUrl
      if (!url) {
        setError('No checkout URL returned.')
        return
      }

      const opened = openPopupSafely(url)
      if (!opened) setBlockedUrl(url)
    } catch (e: any) {
      setError(e?.message || 'Checkout error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      {/* Top-right Creator Admin link (only if both IDs are present) */}
      {!!user_id && !!project_id && (
        <a
          href={creatorHref}
          className="fixed right-4 top-4 z-50 rounded-full border px-3 py-2 text-sm bg-foreground text-background hover:opacity-90"
        >
          Creator Admin
        </a>
      )}

      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Hello, World</h1>
        <p className="text-muted-foreground">Welcome to your new app.</p>

        <div className="flex justify-center">
          <Button onClick={subscribe} disabled={busy}>
            {busy ? 'Starting…' : 'Subscribe — $9.99 / month'}
          </Button>
        </div>

        {blockedUrl && (
          <div className="text-sm text-muted-foreground">
            Popup blocked.{' '}
            <a
              href={blockedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Open payment page
            </a>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    </main>
  )
}
