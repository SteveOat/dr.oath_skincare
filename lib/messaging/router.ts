import { sendFacebookReply } from "./adapters/facebook"
import { sendLineReply } from "./adapters/line"
import { sendInstagramReply } from "./adapters/instagram"
import type { SendReplyInput, SendReplyResult } from "./types"

/**
 * Dispatches a reply to the correct channel adapter (Facebook Graph,
 * LINE Messaging, Instagram Graph). If no token is configured for the
 * channel, the adapter returns status="simulated" so the message is still
 * persisted to the database but no external API call is made.
 */
export async function sendReplyToChannel(input: SendReplyInput): Promise<SendReplyResult> {
  switch (input.channel) {
    case "facebook":
      return sendFacebookReply(input)
    case "line":
      return sendLineReply(input)
    case "instagram":
      return sendInstagramReply(input)
    case "email":
    case "web":
      // No external API for these — just simulate success
      return { ok: true, status: "simulated", error: `${input.channel} channel has no outbound adapter yet` }
    default:
      return { ok: false, status: "failed", error: `Unknown channel: ${input.channel}` }
  }
}
