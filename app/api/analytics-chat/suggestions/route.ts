import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"

export const maxDuration = 10
const MODEL_TIMEOUT_MS = 4500

interface IncomingMessage {
  role: "user" | "assistant" | "system"
  content: string
}

const SYSTEM_PROMPT = `You generate exactly 3 short follow-up questions the user would naturally ask next in an analytics conversation about an e-commerce store.

Rules:
- Each question MUST build directly on what the assistant just said.
- Be specific: reference exact platforms, products, campaigns, or numbers from the last assistant message.
- Mix types: drill-down, comparison, action, or scope-shift.
- Each question under 60 characters.
- Phrase as natural questions a marketing operator would type.
- Avoid generic prompts like "tell me more".

Respond with ONLY a JSON array of 3 strings, nothing else. Example:
["Why is Facebook ROAS dropping?","How does TikTok compare?","Should I pause this campaign?"]`

function fallbackSuggestions(messages: IncomingMessage[]): string[] {
  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === "assistant")
  const text = (lastAssistant?.content || "").toLowerCase()

  if (text.includes("ad spend") || text.includes("roas") || text.includes("campaign")) {
    if (text.includes("$0.00") || text.includes("no spend") || text.includes("no tagged")) {
      return [
        "How do I add ad spend?",
        "Which UTMs are missing?",
        "Show tagged ad clicks",
      ]
    }

    return [
      "Which campaign should pause?",
      "Compare spend by platform",
      "Show campaign ROAS details",
    ]
  }

  if (text.includes("stock") || text.includes("restock") || text.includes("inventory")) {
    return [
      "Which products are lowest?",
      "How many units should I order?",
      "Show slow-moving stock",
    ]
  }

  if (text.includes("revenue") || text.includes("purchase") || text.includes("sales")) {
    return [
      "Which products drove revenue?",
      "Show recent purchases",
      "Compare revenue by category",
    ]
  }

  return [
    "What changed most today?",
    "What should I fix first?",
    "Show the biggest risk",
  ]
}

function parseSuggestions(text: string): string[] {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim()
  const parsed = JSON.parse(cleaned)
  if (!Array.isArray(parsed)) return []

  return parsed
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
}

export async function POST(req: Request) {
  try {
    const { messages }: { messages: IncomingMessage[] } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ suggestions: [] })
    }

    // Only need the last assistant message + last user message for context.
    // Keeping the prompt tiny is the biggest speed win.
    const recent = messages.slice(-4)
    const transcript = recent
      .map(
        (m) =>
          `${m.role === "user" ? "User" : "Assistant"}: ${(m.content || "").slice(0, 400)}`,
      )
      .join("\n\n")

    const fallback = fallbackSuggestions(messages)

    try {
      // Keep this as plain JSON parsing instead of structured output to minimize latency.
      const result = await Promise.race([
        generateText({
          model: xai("grok-3-latest"),
          system: SYSTEM_PROMPT,
          prompt: `Conversation so far:\n\n${transcript}\n\nReturn the JSON array now.`,
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), MODEL_TIMEOUT_MS)),
      ])
      const suggestions = result ? parseSuggestions(result.text) : []
      return Response.json({ suggestions: suggestions.length > 0 ? suggestions : fallback })
    } catch {
      return Response.json({ suggestions: fallback })
    }
  } catch (error) {
    console.error("[suggestions]", error)
    return Response.json({ suggestions: [] })
  }
}
