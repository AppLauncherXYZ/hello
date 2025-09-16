// app/page.tsx
'use client'

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

type CheckoutResponse = {
  url?: string
  checkoutUrl?: string
  success?: boolean
  [k: string]: any
}

function normalizeId(v?: string | null) {
  return (v ?? '').trim() || ''
}

function extractIdsFromParams(params: URLSearchParams) {
  // Accept multiple naming styles
  const user_id =
    normalizeId(params.get('user_id')) ||
    normalizeId(params.get('userId')) ||
    normalizeId(params.get('uid'))
  const project_id =
    normalizeId(params.get('project_id')) ||
    normalizeId(params.get('projectId'))
  return { user_id, project_id }
}

/**
 * Tries an <a> click first (more permissive in iframes), falls back to window.open.
 */
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
  } catch {
    // no-op
  }
  const w = window.open(url, '_blank', 'noopener')
  return !!w
}

export default function Page() {
  const searchParams = useSearchParams()
  const initial = useMemo(() => extractIdsFromParams(searchParams), [searchParams])

  const [userId, setUserId] = useState(initial.user_id)
  const [projectId, setProjectId] = useState(initial.project_id)

  const [productKey, setProductKey] = useState<'support5' | 'pro999'>('pro999')
  const [customName, setCustomName] = useState('')
  const [customCents, setCustomCents] = useState<number | ''>('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)
  const [showFallback, setShowFallback] = useState(false)

  // Optional balance
  const [balance, setBalance] = useState<number | null>(null)
  const [loadingBal, setLoadingBal] = useState(false)

  useEffect(() => {
    setUserId(initial.user_id)
    setProjectId(initial.project_id)
  }, [initial.user_id, initial.project_id])

  const missingIds = !userId || !projectId

  const chosen = useMemo(() => {
    if (productKey === 'support5') {
      return { productName: 'Support Pack ($5)', priceCents: 500 }
    }
    // default: subscription example
    return { productName: 'Pro Monthly ($9.99)', priceCents: 999 }
  }, [productKey])

  async function startCheckout() {
    setError(null)
    setShowFallback(false)
    setFallbackUrl(null)

    const productName =
      (customName || '').trim() || chosen.productName
    const priceCents =
      customCents !== '' ? Number(customCents) : chosen.priceCents

    if (!userId || !projectId) {
      setError('Missing user_id and/or project_id in URL.')
      return
    }
    if (!productName || !Number.isFinite(priceCents) || priceCents <= 0) {
      setError('Provide a valid product name and positive integer price (cents).')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          project_id: projectId,
          productName,
          priceCents: Math.round(priceCents),
        }),
      })
      const data: CheckoutResponse = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Checkout failed')
        return
      }
      const url = data.url || data.checkoutUrl
      if (!url) {
        setError('Parent did not return a checkout URL.')
        return
      }
      const opened = openPopupSafely(url)
      if (!opened) {
        // Fallback: show a dialog with a normal link
        setFallbackUrl(url)
        setShowFallback(true)
      }
    } catch (e: any) {
      setError(e?.message || 'Checkout error')
    } finally {
      setLoading(false)
    }
  }

  async function spend100() {
    if (!userId || !projectId) {
      setError('Missing user_id and/or project_id in URL.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/credits/check-and-debit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          userId: userId,
          project_id: projectId,
          projectId: projectId,
          cost: 100,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Debit failed')
      } else {
        // Optional toast could go here
        console.log('Debit OK:', data)
      }
    } catch (e: any) {
      setError(e?.message || 'Debit error')
    } finally {
      setLoading(false)
    }
  }

  async function fetchBalance() {
    if (!userId || !projectId) {
      setError('Missing user_id and/or project_id in URL.')
      return
    }
    setError(null)
    setLoadingBal(true)
    try {
      const url = `/api/credits/balance?user_id=${encodeURIComponent(userId)}&project_id=${encodeURIComponent(projectId)}`
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Failed to fetch balance')
      } else {
        // Expecting { balanceCents: number } or similar; keep verbatim-safe:
        const b = (data.balanceCents ?? data.balance ?? null) as number | null
        if (typeof b === 'number') setBalance(b)
      }
    } catch (e: any) {
      setError(e?.message || 'Balance error')
    } finally {
      setLoadingBal(false)
    }
  }

  return (
    <main className="min-h-screen bg-background py-10">
      <div className="container mx-auto max-w-3xl space-y-6 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Welcome — Set Up Your Purchase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {missingIds && (
              <Alert variant="destructive">
                <AlertTitle>Missing identifiers</AlertTitle>
                <AlertDescription>
                  Add <code>?user_id=...&project_id=...</code> (or aliases <code>userId</code>, <code>uid</code>, <code>projectId</code>) to the URL.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="userId">user_id</Label>
                <Input
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="required"
                />
              </div>
              <div>
                <Label htmlFor="projectId">project_id</Label>
                <Input
                  id="projectId"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="required"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Choose a product</Label>
                <Select
                  value={productKey}
                  onValueChange={(v) => setProductKey(v as 'support5' | 'pro999')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pro999">Pro Monthly — $9.99</SelectItem>
                    <SelectItem value="support5">Support Pack — $5.00</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This calls <code>/api/create-payment</code> which proxies to the parent’s <code>/api/credits/checkout</code>.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customName">Override name & price (optional)</Label>
                <Input
                  id="customName"
                  placeholder="Custom product name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Price in cents (e.g., 999)"
                  value={customCents}
                  onChange={(e) =>
                    setCustomCents(e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  If set, these override the selected product. Price must be an integer in cents.
                </p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Action failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={startCheckout} disabled={loading || missingIds}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Purchase / Subscribe
              </Button>

              <Button variant="secondary" onClick={spend100} disabled={loading || missingIds}>
                Spend 100 credits
              </Button>

              <Button variant="outline" onClick={fetchBalance} disabled={loadingBal || missingIds}>
                {loadingBal ? 'Loading…' : 'Check balance'}
              </Button>

              {typeof balance === 'number' && (
                <span className="text-sm text-muted-foreground self-center">
                  Balance: {(balance / 100).toFixed(2)} credits
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              This page reads identifiers from the URL and posts to your local API routes:
              <code className="mx-1">/api/create-payment</code> and
              <code className="mx-1">/api/credits/check-and-debit</code>.
            </p>
            <p>
              Those routes proxy to the parent:
              <code className="mx-1">/api/credits/checkout</code> and
              <code className="mx-1">/api/credits/check-and-debit</code>, forwarding cookies/auth and both
              <em>snake</em> + <em>camel</em> keys for compatibility.
            </p>
            <p>
              Checkout URLs open with an iframe-safe anchor click first, then a fallback popup or link.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fallback modal with a plain link if the popup was blocked */}
      <Dialog open={showFallback} onOpenChange={setShowFallback}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Payment Page</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your browser blocked the popup. Use the link below to continue:
          </p>
          <div className="mt-2">
            {fallbackUrl ? (
              <a
                href={fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary break-all"
              >
                {fallbackUrl}
              </a>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowFallback(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
