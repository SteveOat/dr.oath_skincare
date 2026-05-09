import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runMarketResearch } from "@/lib/market-research/agent"

// Vercel Cron will hit this endpoint daily. The agent only runs if the user
// has explicitly enabled it in the settings table (off by default).
export const maxDuration = 300

export async function GET(req: Request) {
  // Verify Vercel Cron signature when CRON_SECRET is configured
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const supabase = await createClient()
    const { data: settings } = await supabase
      .from("market_research_settings")
      .select("enabled, schedule_hour, schedule_timezone")
      .eq("id", 1)
      .single()

    if (!settings?.enabled) {
      return NextResponse.json({
        skipped: true,
        reason: "Market research agent is disabled in settings",
      })
    }

    // Optional hour-of-day gate. The cron runs hourly; only execute when the
    // current hour in the configured timezone matches the user's schedule_hour.
    const tz = settings.schedule_timezone || "Asia/Bangkok"
    const targetHour = settings.schedule_hour ?? 8
    const nowHourInTz = parseInt(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit",
        hour12: false,
      }).format(new Date()),
      10,
    )

    if (nowHourInTz !== targetHour) {
      return NextResponse.json({
        skipped: true,
        reason: `Current hour ${nowHourInTz} in ${tz} != scheduled ${targetHour}`,
      })
    }

    const result = await runMarketResearch({ triggerType: "scheduled" })
    return NextResponse.json(result)
  } catch (err) {
    console.error("[market-research] Cron error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron failed" },
      { status: 500 },
    )
  }
}
