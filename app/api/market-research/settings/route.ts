import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("market_research_settings")
      .select("*")
      .eq("id", 1)
      .single()

    if (error) throw error
    return NextResponse.json({ settings: data })
  } catch (err) {
    console.error("[market-research] GET settings error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load settings" },
      { status: 500 },
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const updates: Record<string, unknown> = {}

    if (typeof body.enabled === "boolean") updates.enabled = body.enabled
    if (typeof body.business_context === "string")
      updates.business_context = body.business_context.slice(0, 4000)
    if (Array.isArray(body.research_topics)) {
      updates.research_topics = body.research_topics
        .filter((t: unknown) => typeof t === "string")
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0 && t.length <= 200)
        .slice(0, 20)
    }
    if (typeof body.schedule_hour === "number" && body.schedule_hour >= 0 && body.schedule_hour <= 23)
      updates.schedule_hour = Math.floor(body.schedule_hour)
    if (typeof body.schedule_timezone === "string")
      updates.schedule_timezone = body.schedule_timezone.slice(0, 64)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("market_research_settings")
      .update(updates)
      .eq("id", 1)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ settings: data })
  } catch (err) {
    console.error("[market-research] PATCH settings error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    )
  }
}
