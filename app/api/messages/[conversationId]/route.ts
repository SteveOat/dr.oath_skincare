import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const MOCK_THREADS: Record<string, any[]> = {
  "mock-1": [
    { id: "m1-1", direction: "inbound", sender_type: "customer", sender_name: "Sarah Chen", content: "Hi! I love your products", created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
    { id: "m1-2", direction: "outbound", sender_type: "agent", sender_name: "Support Team", content: "Thank you Sarah! How can we help today?", created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
    { id: "m1-3", direction: "inbound", sender_type: "customer", sender_name: "Sarah Chen", content: "Is the Radiance Serum back in stock?", created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
    { id: "m1-4", direction: "inbound", sender_type: "customer", sender_name: "Sarah Chen", content: "I really need it before my trip next week", created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
  ],
  "mock-2": [
    { id: "m2-1", direction: "inbound", sender_type: "customer", sender_name: "Tanaka Yuki", content: "こんにちは!", created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
    { id: "m2-2", direction: "inbound", sender_type: "customer", sender_name: "Tanaka Yuki", content: "Order #1234 shipping update?", created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString() },
  ],
  "mock-4": [
    { id: "m4-1", direction: "inbound", sender_type: "customer", sender_name: "James Park", content: "Hello, I have a problem", created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
    { id: "m4-2", direction: "inbound", sender_type: "customer", sender_name: "James Park", content: "My order arrived but the bottle was broken", created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
    { id: "m4-3", direction: "inbound", sender_type: "customer", sender_name: "James Park", content: "Received damaged product", created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
  ],
}

function buildMockThread(conversationId: string, customerName: string, preview: string) {
  return [
    { id: `${conversationId}-fallback-1`, direction: "inbound", sender_type: "customer", sender_name: customerName, content: preview, created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  ]
}

export async function GET(_req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params

  if (conversationId.startsWith("mock-")) {
    const messages = MOCK_THREADS[conversationId] || buildMockThread(conversationId, "Customer", "Hello, I have a question")
    return NextResponse.json({ messages, usingMock: true })
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("customer_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (error) throw error
    return NextResponse.json({ messages: data || [], usingMock: false })
  } catch (err) {
    console.error("[v0] thread API error:", err)
    return NextResponse.json({ messages: [], usingMock: true })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params
  const { content } = await req.json()

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Content required" }, { status: 400 })
  }

  const newMessage = {
    id: `reply-${Date.now()}`,
    conversation_id: conversationId,
    direction: "outbound" as const,
    sender_type: "agent" as const,
    sender_name: "Support Team",
    content: content.trim(),
    created_at: new Date().toISOString(),
  }

  if (conversationId.startsWith("mock-")) {
    return NextResponse.json({ message: newMessage, usingMock: true })
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("customer_messages")
      .insert({
        conversation_id: conversationId,
        direction: "outbound",
        sender_type: "agent",
        sender_name: "Support Team",
        content: content.trim(),
      })
      .select()
      .single()

    if (error) throw error

    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content.trim().slice(0, 100),
        unread_count: 0,
      })
      .eq("id", conversationId)

    return NextResponse.json({ message: data })
  } catch (err) {
    console.error("[v0] reply API error:", err)
    return NextResponse.json({ message: newMessage, usingMock: true })
  }
}
