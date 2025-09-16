import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { amount, type, tier, project_id, user_id, interval = 'month', intervalCount = 1 } = await request.json()

    if (!user_id || !project_id) {
      return NextResponse.json({ success: false, error: "Missing user_id or project_id in query/body" }, { status: 400 })
    }
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 })
    }

    // Build product details
    const priceCents = Math.round(amount * 100)
    const productName =
      type === "subscription"
        ? (tier ? `${tier} (monthly credits)` : `Subscription (monthly credits)`)
        : `Coffee x${amount}`

    const description =
      type === "subscription"
        ? "Recurring support converted to credits"
        : "One-time support converted to credits"

    const base = process.env.NEXT_PUBLIC_PARENT_API_BASE || "https://applauncher.xyz"
    if (!base) {
      return NextResponse.json({ success: false, error: "NEXT_PUBLIC_PARENT_API_BASE env var not set" }, { status: 500 })
    }
    if (!process.env.NEXT_PUBLIC_PARENT_API_BASE) {
      console.log("NEXT_PUBLIC_PARENT_API_BASE env var not set")
    }

    console.log("Creating checkout session for user_id:", user_id, "and project_id:", project_id, "type:", type)

    const res = await fetch(`${base}/api/credits/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // required for parent
        user_id,
        project_id,
        productName,
        description,
        priceCents,
        // NEW: tell parent this is subscription (or one-time) and the cadence
        type,                 // 'subscription' | 'one-time'
        interval,             // 'day' | 'week' | 'month' | 'year'  (default 'month')
        intervalCount,        // integer >= 1   (default 1)
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("Parent credits/checkout failed:", res.status, text)
      return NextResponse.json({ success: false, error: "Failed to create checkout session" }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json({ success: true, url: data.url })
  } catch (error) {
    console.error("[create-payment] Error:", error)
    return NextResponse.json({ success: false, error: "Payment processing failed" }, { status: 500 })
  }
}

