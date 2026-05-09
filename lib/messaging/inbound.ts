import { createClient } from "@/lib/supabase/server"
import type { InboundMessage } from "./types"

/**
 * Upserts an inbound message: ensures the conversation exists, then
 * inserts the customer_messages row and bumps the conversation summary.
 */
export async function ingestInboundMessage(msg: InboundMessage) {
  const supabase = await createClient()

  // Find or create the conversation
  const { data: existing } = await supabase
    .from("conversations")
    .select("id, unread_count")
    .eq("channel", msg.channel)
    .eq("customer_external_id", msg.customerExternalId)
    .maybeSingle()

  let conversationId = existing?.id as string | undefined

  if (!conversationId) {
    const { data: created, error: createErr } = await supabase
      .from("conversations")
      .insert({
        channel: msg.channel,
        customer_external_id: msg.customerExternalId,
        customer_name: msg.customerName,
        customer_avatar_url: msg.customerAvatarUrl || null,
        status: "open",
        priority: "normal",
        last_message_at: msg.receivedAt,
        last_message_preview: msg.content.slice(0, 100),
        unread_count: 1,
      })
      .select("id")
      .single()

    if (createErr) {
      console.error("[v0] failed to create conversation:", createErr)
      throw createErr
    }
    conversationId = created.id
  } else {
    await supabase
      .from("conversations")
      .update({
        last_message_at: msg.receivedAt,
        last_message_preview: msg.content.slice(0, 100),
        unread_count: (existing?.unread_count || 0) + 1,
      })
      .eq("id", conversationId)
  }

  // Insert the message
  const { error: msgErr } = await supabase.from("customer_messages").insert({
    conversation_id: conversationId,
    direction: "inbound",
    sender_type: "customer",
    sender_name: msg.customerName,
    content: msg.content,
    external_message_id: msg.externalMessageId,
    attachments: msg.attachments || [],
    is_read: false,
  })

  if (msgErr) {
    console.error("[v0] failed to insert inbound message:", msgErr)
    throw msgErr
  }

  return { conversationId }
}
