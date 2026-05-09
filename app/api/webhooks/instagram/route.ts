import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { ingestInboundMessage } from "@/lib/messaging/inbound"

// GET: Instagram (via Meta) webhook verification
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN || process.env.FACEBOOK_VERIFY_TOKEN
  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge, { status: 200 })
  }
  return new Response("Forbidden", { status: 403 })
}

// POST: Instagram message events (delivered through Meta Graph webhooks)
export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get("x-hub-signature-256")
  const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET

  if (appSecret && signature) {
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")
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

  if (body.object !== "instagram") {
    return NextResponse.json({ ok: true })
  }

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      if (event.message && !event.message.is_echo) {
        try {
          await ingestInboundMessage({
            channel: "instagram",
            customerExternalId: event.sender.id,
            customerName: event.sender.username || `IG User ${event.sender.id.slice(-6)}`,
            content: event.message.text || "[non-text message]",
            externalMessageId: event.message.mid,
            receivedAt: new Date(event.timestamp || Date.now()).toISOString(),
            attachments: (event.message.attachments || []).map((a: any) => ({
              type: a.type,
              url: a.payload?.url,
            })),
          })
        } catch (err) {
          console.error("[v0] instagram webhook ingest error:", err)
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}
