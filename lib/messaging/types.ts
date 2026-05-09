export type ChannelKey = "facebook" | "line" | "instagram" | "email" | "web"

export interface SendReplyInput {
  channel: ChannelKey
  customerExternalId: string
  content: string
  conversationId: string
}

export interface SendReplyResult {
  ok: boolean
  externalMessageId?: string
  status: "delivered" | "failed" | "simulated"
  error?: string
  raw?: unknown
}

export interface InboundMessage {
  channel: ChannelKey
  customerExternalId: string
  customerName: string
  customerAvatarUrl?: string
  content: string
  externalMessageId: string
  receivedAt: string
  attachments?: Array<{ type: string; url?: string }>
}
