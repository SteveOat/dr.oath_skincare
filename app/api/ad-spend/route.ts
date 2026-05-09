import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("analytics_ad_spend")
    .select("*")
    .order("period_start", { ascending: false })
    .limit(500)

  if (error) {
    console.error("[v0] ad-spend GET failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ rows: data ?? [] })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })

  const platform = String(body.platform || "").toLowerCase().trim()
  const campaign = body.campaign ? String(body.campaign).trim() : null
  const period_start = String(body.period_start || "").trim()
  const period_end = String(body.period_end || "").trim()
  const amount = Number(body.amount)
  const currency = String(body.currency || "USD").toUpperCase().trim()
  const notes = body.notes ? String(body.notes).trim() : null

  if (!platform) {
    return NextResponse.json({ error: "platform is required" }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(period_start) || !/^\d{4}-\d{2}-\d{2}$/.test(period_end)) {
    return NextResponse.json(
      { error: "period_start and period_end must be YYYY-MM-DD" },
      { status: 400 },
    )
  }
  if (period_end < period_start) {
    return NextResponse.json(
      { error: "period_end must be on or after period_start" },
      { status: 400 },
    )
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "amount must be a non-negative number" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("analytics_ad_spend")
    .insert({
      platform,
      campaign,
      period_start,
      period_end,
      amount,
      currency,
      notes,
    })
    .select("*")
    .single()

  if (error) {
    console.error("[v0] ad-spend POST failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ row: data })
}
