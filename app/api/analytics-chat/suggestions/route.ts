import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"

export const maxDuration = 10

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

    // Keep this as plain JSON parsing instead of structured output to minimize latency.
    const result = await generateText({
      model: xai("grok-4-latest"),
      system: SYSTEM_PROMPT,
      prompt: `Conversation so far:\n\n${transcript}\n\nReturn the JSON array now.`,
    })

    let suggestions: string[] = []
    try {
      // Strip code fences if the model wrapped them
      const cleaned = result.text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim()
      const parsed = JSON.parse(cleaned)
      if (Array.isArray(parsed)) {
        suggestions = parsed
          .filter((x): x is string => typeof x === "string")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 3)
      }
    } catch {
      // If parsing fails, just return empty — UI will hide the section.
      suggestions = []
    }

    return Response.json({ suggestions })
  } catch (error) {
    console.error("[suggestions]", error)
    return Response.json({ suggestions: [] })
  }
}
