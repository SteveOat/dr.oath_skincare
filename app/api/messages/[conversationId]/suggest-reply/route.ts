import { NextResponse } from "next/server"
import { generateText, Output } from "ai"
import { xai } from "@ai-sdk/xai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 30

const SuggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      tone: z.enum(["friendly", "professional", "empathetic", "concise"]),
      label: z.string().describe("A 2-3 word label describing this reply style"),
      text: z.string().describe("The actual reply text to send to the customer"),
    }),
  ).length(3),
})

const CHANNEL_GUIDANCE: Record<string, string> = {
  facebook: "Casual and friendly. Use the customer's first name when natural. Emoji sparingly OK.",
  line: "Warm and concise. LINE users prefer short, fast replies.",
  instagram: "Casual and on-brand. Match the conversational, visual tone.",
  email: "Professional with a greeting and sign-off. Slightly more formal.",
  web: "Helpful and direct. Acknowledge their question, then answer.",
}

function buildFallbackSuggestions(lastInbound: string, customerName: string) {
  const firstName = customerName.split(" ")[0] || "there"
  return {
    suggestions: [
      {
        tone: "friendly" as const,
        label: "Quick acknowledgment",
        text: `Hi ${firstName}! Thanks for reaching out. Let me look into this for you right away.`,
      },
      {
        tone: "professional" as const,
        label: "Formal response",
        text: `Hello ${firstName}, thank you for your message. I'd be happy to help you with this. Could you share a bit more detail so I can assist you better?`,
      },
      {
        tone: "empathetic" as const,
        label: "Empathetic reply",
        text: `Hi ${firstName}, I completely understand. Let me see what I can do to help resolve this for you.`,
      },
    ],
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await params

  try {
    // Load conversation + recent messages for context
    let conversation: any = null
    let messages: any[] = []
    let usingMock = false

    if (!conversationId.startsWith("mock-")) {
      try {
        const supabase = await createClient()
        const [convRes, msgRes] = await Promise.all([
          supabase.from("conversations").select("*").eq("id", conversationId).single(),
          supabase
            .from("customer_messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .limit(20),
        ])
        if (convRes.error) throw convRes.error
        conversation = convRes.data
        messages = msgRes.data || []
      } catch {
        usingMock = true
      }
    } else {
      usingMock = true
    }

    // Read body for any context the client wants to pass for mock conversations
    const body = await req.json().catch(() => ({}))
    if (usingMock) {
      conversation = body.conversation || conversation
      messages = body.messages || messages
    }

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const lastInboundMsg =
      [...messages].reverse().find((m: any) => m.direction === "inbound") || messages[messages.length - 1]
    const lastInboundText = lastInboundMsg?.content || conversation.last_message_preview || ""

    // Build transcript for the model
    const transcript = messages
      .slice(-10)
      .map((m: any) => {
        const speaker = m.direction === "outbound" ? "AGENT" : "CUSTOMER"
        return `${speaker}: ${m.content}`
      })
      .join("\n")

    const channel = conversation.channel as string
    const channelTone = CHANNEL_GUIDANCE[channel] || "Be helpful and clear."

    const systemPrompt = `You are an expert customer-support assistant for Dr.Oat SkinCare, a clean skincare brand selling serums, moisturizers, cleansers, and treatments.

You help human agents draft replies. Generate exactly 3 distinct reply drafts the agent can choose from. Each draft must:
- Directly address the customer's most recent message
- Match the channel's tone: ${channel.toUpperCase()} — ${channelTone}
- Use the customer's first name when natural (their name: ${conversation.customer_name})
- Stay under 280 characters when possible
- Never invent product details, prices, shipping times, or policies you don't know — instead, offer to check
- Sound like a human, not an AI

Return three replies with different tones (friendly, professional, empathetic, or concise). Vary them meaningfully so the agent has real choice.`

    const userPrompt = `CONVERSATION CONTEXT:
- Channel: ${channel}
- Customer: ${conversation.customer_name}
- Priority: ${conversation.priority}
- Status: ${conversation.status}
- Tags: ${(conversation.tags || []).join(", ") || "none"}

RECENT TRANSCRIPT (oldest to newest):
${transcript || `CUSTOMER: ${lastInboundText}`}

Generate 3 reply drafts the agent could send next.`

    try {
      const result = await generateText({
        model: xai("grok-4-latest"),
        system: systemPrompt,
        prompt: userPrompt,
        output: Output.object({ schema: SuggestionsSchema }),
      })

      return NextResponse.json({
        suggestions: result.output.suggestions,
        usingMock,
      })
    } catch (aiErr) {
      console.error("[v0] AI generation failed, returning fallback:", aiErr)
      return NextResponse.json({
        ...buildFallbackSuggestions(lastInboundText, conversation.customer_name),
        usingMock,
        fallback: true,
      })
    }
  } catch (err) {
    console.error("[v0] suggest-reply error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate suggestions" },
      { status: 500 },
    )
  }
}
