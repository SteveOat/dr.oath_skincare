import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { ingestInboundMessage } from "@/lib/messaging/inbound"

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get("x-line-signature")
  const channelSecret = process.env.LINE_CHANNEL_SECRET

  // Verify HMAC-SHA256 signature
  if (channelSecret && signature) {
    const expected = crypto
      .createHmac("sha256", channelSecret)
      .update(rawBody)
      .digest("base64")
    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected),
      )
    ) {
      return new Response("Invalid signature", { status: 401 })
    }
  }

  let body: any
  try {
    body = JSON.parse(rawBody)
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  for (const event of body.events || []) {
    if (event.type !== "message" || event.message?.type !== "text") continue

    try {
      const userId = event.source?.userId || event.source?.groupId || event.source?.roomId
      if (!userId) continue

      // Optionally fetch display name from LINE Profile API
      let customerName = `LINE User ${userId.slice(-6)}`
      let avatarUrl: string | undefined
      const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
      if (token && event.source?.userId) {
        try {
          const profileRes = await fetch(
            `https://api.line.me/v2/bot/profile/${event.source.userId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          )
          if (profileRes.ok) {
            const profile = await profileRes.json()
            customerName = profile.displayName || customerName
            avatarUrl = profile.pictureUrl
          }
        } catch {
          // Profile fetch failed - continue with default name
        }
      }

      await ingestInboundMessage({
        channel: "line",
        customerExternalId: userId,
        customerName,
        customerAvatarUrl: avatarUrl,
        content: event.message.text,
        externalMessageId: event.message.id,
        receivedAt: new Date(event.timestamp || Date.now()).toISOString(),
      })
    } catch (err) {
      console.error("[v0] line webhook ingest error:", err)
    }
  }

  return NextResponse.json({ ok: true })
}
