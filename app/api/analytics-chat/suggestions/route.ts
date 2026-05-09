import { generateText, Output } from "ai"
import { z } from "zod"

export const maxDuration = 15

const SuggestionsSchema = z.object({
  suggestions: z
    .array(z.string())
    .length(3)
    .describe(
      "Exactly 3 short follow-up questions the user would naturally ask next, each under 60 characters",
    ),
})

interface IncomingMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export async function POST(req: Request) {
  try {
    const { messages }: { messages: IncomingMessage[] } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ suggestions: [] })
    }

    // Take last 8 turns to keep token usage low while preserving context
    const recent = messages.slice(-8)
    const transcript = recent
      .map(
        (m) =>
          `${m.role === "user" ? "User" : "Assistant"}: ${(m.content || "").slice(0, 600)}`,
      )
      .join("\n\n")

    const SYSTEM_PROMPT = `You generate 3 short, natural follow-up questions the user would likely ask next in this analytics conversation about an e-commerce store (Dr.Oat SkinCare).

Rules:
- Each question MUST build directly on what the assistant just said — the user should feel the conversation is continuing, not restarting.
- Be specific: reference exact platforms, products, campaigns, metrics, or numbers from the assistant's last message when possible.
- Mix question types: drill-down ("Why?"), comparison ("How does X compare to Y?"), action ("What should I do about X?"), or scope-shift ("What about Y?").
- Keep each question under 60 characters.
- Phrase as natural questions a marketing operator would type, not generic suggestions.
- Avoid repeating questions the user already asked earlier in this conversation.
- Avoid generic prompts like "tell me more" or "anything else?"

Examples of GOOD follow-ups (notice the specificity):
- "Why is Facebook ROAS dropping?"
- "How does TikTok compare to Instagram?"
- "Should I pause the Spring Sale campaign?"
- "What's driving the CVR drop on Google?"
- "Which products convert best from TikTok?"`

    const result = await generateText({
      model: "openai/gpt-5-mini",
      system: SYSTEM_PROMPT,
      prompt: `Conversation so far:\n\n${transcript}\n\nGenerate 3 follow-up questions.`,
      experimental_output: Output.object({ schema: SuggestionsSchema }),
    })

    const parsed = result.experimental_output as z.infer<typeof SuggestionsSchema>
    return Response.json({ suggestions: parsed.suggestions })
  } catch (error) {
    console.error("[suggestions]", error)
    return Response.json({ suggestions: [] })
  }
}
