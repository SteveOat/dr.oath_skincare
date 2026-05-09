import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase.from("analytics_ad_spend").delete().eq("id", id)
  if (error) {
    console.error("[v0] ad-spend DELETE failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
