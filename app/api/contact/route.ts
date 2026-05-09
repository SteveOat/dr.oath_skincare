import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, subject, message } = body as {
      name?: string
      email?: string
      subject?: string
      message?: string
    }

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 },
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    const supabase = await createClient()

    const externalId = `web:${email.toLowerCase()}`
    const preview = message.slice(0, 140)
    const tags = subject ? [subject] : []
    const fullContent = subject ? `Subject: ${subject}\n\n${message}` : message

    // Try to find an existing conversation for this email on the web channel
    const { data: existing } = await supabase
      .from("conversations")
      .select("id, unread_count")
      .eq("channel", "web")
      .eq("customer_external_id", externalId)
      .maybeSingle()

    let conversationId: string | null = existing?.id ?? null

    if (!conversationId) {
      const { data: created, error: createErr } = await supabase
        .from("conversations")
        .insert({
          channel: "web",
          customer_external_id: externalId,
          customer_name: name,
          status: "open",
          priority: "normal",
          last_message_at: new Date().toISOString(),
          last_message_preview: preview,
          unread_count: 1,
          tags,
        })
        .select("id")
        .single()

      if (createErr || !created) {
        console.error("[contact] failed to create conversation:", createErr)
        return NextResponse.json({ error: "Could not save your message" }, { status: 500 })
      }
      conversationId = created.id
    } else {
      await supabase
        .from("conversations")
        .update({
          customer_name: name,
          last_message_at: new Date().toISOString(),
          last_message_preview: preview,
          unread_count: (existing?.unread_count ?? 0) + 1,
          status: "open",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId)
    }

    const { error: msgErr } = await supabase.from("customer_messages").insert({
      conversation_id: conversationId,
      direction: "inbound",
      sender_type: "customer",
      sender_name: name,
      content: fullContent,
      is_read: false,
      metadata: { source: "contact_form", email, subject: subject ?? null },
    })

    if (msgErr) {
      console.error("[contact] failed to insert message:", msgErr)
      return NextResponse.json({ error: "Could not save your message" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[contact] unexpected error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
