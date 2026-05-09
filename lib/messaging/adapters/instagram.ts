import type { SendReplyInput, SendReplyResult } from "../types"

const GRAPH_VERSION = "v21.0"

// Instagram Messaging uses the Facebook Graph API with the IG-connected Page token
export async function sendInstagramReply(input: SendReplyInput): Promise<SendReplyResult> {
  const token = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!token) {
    return {
      ok: true,
      status: "simulated",
      error: "INSTAGRAM_PAGE_ACCESS_TOKEN missing - reply saved locally only",
    }
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/me/messages?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: input.customerExternalId },
          messaging_type: "RESPONSE",
          message: { text: input.content },
        }),
      },
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, status: "failed", error: data?.error?.message || `HTTP ${res.status}`, raw: data }
    }
    return { ok: true, status: "delivered", externalMessageId: data?.message_id, raw: data }
  } catch (err) {
    return { ok: false, status: "failed", error: err instanceof Error ? err.message : "Unknown error" }
  }
}
