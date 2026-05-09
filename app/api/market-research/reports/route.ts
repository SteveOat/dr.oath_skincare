import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "30", 10), 100)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("market_research_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error
    return NextResponse.json({ reports: data || [] })
  } catch (err) {
    console.error("[market-research] GET reports error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load reports" },
      { status: 500 },
    )
  }
}
