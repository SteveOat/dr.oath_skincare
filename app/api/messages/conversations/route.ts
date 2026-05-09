import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const MOCK_CONVERSATIONS = [
  { id: "mock-1", channel: "facebook", customer_external_id: "fb_user_001", customer_name: "Sarah Chen", customer_avatar_url: null, status: "open", priority: "high", last_message_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), last_message_preview: "Is the Radiance Serum back in stock?", unread_count: 2, tags: ["product-inquiry"] },
  { id: "mock-2", channel: "line", customer_external_id: "line_user_002", customer_name: "Tanaka Yuki", customer_avatar_url: null, status: "open", priority: "normal", last_message_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(), last_message_preview: "Order #1234 shipping update?", unread_count: 1, tags: ["order-status"] },
  { id: "mock-3", channel: "instagram", customer_external_id: "ig_user_003", customer_name: "Maria Santos", customer_avatar_url: null, status: "pending", priority: "normal", last_message_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(), last_message_preview: "Love the new packaging!", unread_count: 0, tags: ["feedback"] },
  { id: "mock-4", channel: "facebook", customer_external_id: "fb_user_004", customer_name: "James Park", customer_avatar_url: null, status: "open", priority: "urgent", last_message_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), last_message_preview: "Received damaged product", unread_count: 3, tags: ["complaint", "priority"] },
  { id: "mock-5", channel: "line", customer_external_id: "line_user_005", customer_name: "Pim Suksai", customer_avatar_url: null, status: "open", priority: "normal", last_message_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(), last_message_preview: "How long does shipping to Bangkok take?", unread_count: 1, tags: ["shipping"] },
  { id: "mock-6", channel: "instagram", customer_external_id: "ig_user_006", customer_name: "Emma Wilson", customer_avatar_url: null, status: "open", priority: "normal", last_message_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), last_message_preview: "Are your products cruelty-free?", unread_count: 1, tags: ["product-inquiry"] },
  { id: "mock-7", channel: "facebook", customer_external_id: "fb_user_007", customer_name: "Liu Wei", customer_avatar_url: null, status: "resolved", priority: "low", last_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), last_message_preview: "Thanks for the quick response!", unread_count: 0, tags: ["resolved"] },
  { id: "mock-8", channel: "instagram", customer_external_id: "ig_user_009", customer_name: "Aisha Rahman", customer_avatar_url: null, status: "open", priority: "high", last_message_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(), last_message_preview: "Allergic reaction question", unread_count: 2, tags: ["urgent", "health"] },
  { id: "mock-9", channel: "line", customer_external_id: "line_user_010", customer_name: "Somchai R.", customer_avatar_url: null, status: "pending", priority: "normal", last_message_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(), last_message_preview: "Promotion code not working", unread_count: 1, tags: ["support"] },
]

const MOCK_CHANNELS = [
  { channel: "facebook", display_name: "Facebook Page", is_connected: true, account_handle: "@DrOatSkinCare", last_sync_at: new Date().toISOString() },
  { channel: "line", display_name: "LINE Official", is_connected: true, account_handle: "@droat", last_sync_at: new Date().toISOString() },
  { channel: "instagram", display_name: "Instagram", is_connected: true, account_handle: "@droat.skincare", last_sync_at: new Date().toISOString() },
  { channel: "email", display_name: "Email Support", is_connected: true, account_handle: "support@droat.com", last_sync_at: new Date().toISOString() },
  { channel: "web", display_name: "Website Chat", is_connected: false, account_handle: null, last_sync_at: null },
]

export async function GET() {
  try {
    const supabase = await createClient()

    const [convResult, chanResult] = await Promise.all([
      supabase.from("conversations").select("*").order("last_message_at", { ascending: false }),
      supabase.from("channel_connections").select("*"),
    ])

    if (convResult.error || !convResult.data || convResult.data.length === 0) {
      return NextResponse.json({
        conversations: MOCK_CONVERSATIONS,
        channels: MOCK_CHANNELS,
        usingMock: true,
      })
    }

    return NextResponse.json({
      conversations: convResult.data,
      channels: chanResult.data && chanResult.data.length > 0 ? chanResult.data : MOCK_CHANNELS,
      usingMock: false,
    })
  } catch (err) {
    console.error("[v0] conversations API error:", err)
    return NextResponse.json({
      conversations: MOCK_CONVERSATIONS,
      channels: MOCK_CHANNELS,
      usingMock: true,
    })
  }
}
