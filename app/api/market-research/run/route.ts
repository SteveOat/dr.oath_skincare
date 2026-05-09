import { NextResponse } from "next/server"
import { runMarketResearch } from "@/lib/market-research/agent"

// Allow up to 5 minutes for the agent to finish (multi-step web search + synthesis)
export const maxDuration = 300

export async function POST() {
  const result = await runMarketResearch({ triggerType: "manual" })
  if (result.status === "failed") {
    return NextResponse.json(
      { reportId: result.reportId, status: result.status, error: result.error },
      { status: 500 },
    )
  }
  return NextResponse.json(result)
}
