import type { SendReplyInput, SendReplyResult } from "../types"

export async function sendLineReply(input: SendReplyInput): Promise<SendReplyResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) {
    return {
      ok: true,
      status: "simulated",
      error: "LINE_CHANNEL_ACCESS_TOKEN missing - reply saved locally only",
    }
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: input.customerExternalId,
        messages: [{ type: "text", text: input.content }],
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, status: "failed", error: data?.message || `HTTP ${res.status}`, raw: data }
    }
    return {
      ok: true,
      status: "delivered",
      externalMessageId: data?.sentMessages?.[0]?.id,
      raw: data,
    }
  } catch (err) {
    return { ok: false, status: "failed", error: err instanceof Error ? err.message : "Unknown error" }
  }
}
