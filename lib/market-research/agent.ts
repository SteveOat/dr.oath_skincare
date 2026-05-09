import { openai } from "@ai-sdk/openai"
import { generateText, Output, stepCountIs } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

/**
 * Market Research Agent
 * ---------------------
 * Real AI agent that performs web research using OpenAI's web_search_preview
 * tool (via the Responses API + Vercel AI Gateway). Returns structured insights
 * and source citations, then persists them to Supabase.
 */

const InsightSchema = z.object({
  title: z.string().describe("Short headline of the insight (max 80 chars)"),
  detail: z
    .string()
    .describe("2-3 sentence explanation of what was found and why it matters"),
  category: z
    .enum(["industry", "competitor", "ingredient", "trend", "platform", "regulation", "other"])
    .describe("Category bucket for filtering"),
  relevance: z
    .enum(["high", "medium", "low"])
    .describe("How relevant this insight is to the business"),
})

const ReportSchema = z.object({
  headline: z
    .string()
    .describe("Single sentence summary of the most important finding today"),
  summary: z
    .string()
    .describe("Executive summary in 3-5 sentences covering key themes"),
  insights: z
    .array(InsightSchema)
    .min(3)
    .max(8)
    .describe("Detailed insights ordered by relevance"),
  recommendations: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("Concrete actionable recommendations for the business"),
  topics: z
    .array(z.string())
    .describe("Topic tags used as filters/keywords (e.g. 'oat-beta-glucan', 'TikTok-Shop')"),
})

export type ResearchReport = z.infer<typeof ReportSchema>

export type RunOptions = {
  triggerType?: "manual" | "scheduled"
  businessContext?: string
  topics?: string[]
}

export type RunResult = {
  reportId: string
  status: "success" | "failed"
  error?: string
}

/**
 * Run a single research cycle. Creates a `pending` report row immediately so
 * the UI can show progress, then updates it with the AI output (or error).
 */
export async function runMarketResearch(opts: RunOptions = {}): Promise<RunResult> {
  const supabase = await createClient()
  const startedAt = Date.now()

  // Load settings if context/topics not provided
  let businessContext = opts.businessContext
  let topics = opts.topics
  if (!businessContext || !topics) {
    const { data: settings } = await supabase
      .from("market_research_settings")
      .select("business_context, research_topics")
      .eq("id", 1)
      .single()
    businessContext = businessContext || settings?.business_context || ""
    topics = topics || settings?.research_topics || []
  }

  // Insert pending report so the UI shows it immediately
  const { data: pending, error: insertErr } = await supabase
    .from("market_research_reports")
    .insert({
      trigger_type: opts.triggerType || "manual",
      status: "pending",
      topics: topics,
    })
    .select("id")
    .single()

  if (insertErr || !pending) {
    return {
      reportId: "",
      status: "failed",
      error: insertErr?.message || "Could not create report row",
    }
  }

  const reportId = pending.id as string
  const today = new Date().toISOString().slice(0, 10)
  const topicList = (topics || []).map((t, i) => `${i + 1}. ${t}`).join("\n")

  const systemPrompt = `You are a senior market research analyst working for an e-commerce business.
You have access to live web search. Today's date is ${today}.

Your job is to:
1. Search the web for current news and developments relevant to this business across the assigned topics
2. Prefer sources from the last 7-14 days
3. Synthesize findings into a structured intelligence briefing
4. Ground every insight in a real source you found via web search
5. Be specific — name competitors, products, prices, percentages, dates whenever possible
6. Skip generic advice; only include insights backed by something you actually found online

Business context:
${businessContext}

Research topics for today's briefing:
${topicList || "(no topics configured — use general industry research)"}`

  const userPrompt = `Produce today's market research briefing.

Run multiple targeted web searches across the topic list. Then synthesize the findings into the structured report. Cite sources by URL. If a topic returns nothing meaningful, skip it rather than padding.`

  let model = "openai/gpt-5-mini"
  let modelUsed = model

  try {
    const result = await generateText({
      // OpenAI Responses API is required for the web_search_preview tool.
      // The AI Gateway routes this automatically (zero-config for OpenAI).
      model: openai.responses("gpt-5-mini"),
      tools: {
        web_search_preview: openai.tools.webSearchPreview({
          searchContextSize: "medium",
        }),
      },
      // Allow up to 10 sequential search/synthesis steps
      maxRetries: 1,
      stopWhen: stepCountIs(10),
      system: systemPrompt,
      prompt: userPrompt,
      experimental_output: Output.object({ schema: ReportSchema }),
    })

    modelUsed = "openai/gpt-5-mini (responses + web_search_preview)"
    const report = result.experimental_output as ResearchReport

    // Extract sources from the response. The OpenAI web_search_preview tool
    // returns URL citations as `sources` on the result.
    const sources = (result.sources || [])
      .filter((s: { sourceType?: string }) => s.sourceType === "url" || !s.sourceType)
      .map((s: { url?: string; title?: string }) => ({
        url: s.url || "",
        title: s.title || s.url || "Source",
      }))
      .filter((s) => s.url)

    // Deduplicate sources by URL
    const seen = new Set<string>()
    const uniqueSources = sources.filter((s) => {
      if (seen.has(s.url)) return false
      seen.add(s.url)
      return true
    })

    await supabase
      .from("market_research_reports")
      .update({
        status: "success",
        headline: report.headline,
        summary: report.summary,
        insights: report.insights,
        recommendations: report.recommendations,
        topics: report.topics,
        sources: uniqueSources,
        raw_text: result.text || null,
        model: modelUsed,
        duration_ms: Date.now() - startedAt,
      })
      .eq("id", reportId)

    await supabase
      .from("market_research_settings")
      .update({
        last_run_at: new Date().toISOString(),
        last_run_status: "success",
        last_run_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)

    return { reportId, status: "success" }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[market-research] Agent failed:", message)

    await supabase
      .from("market_research_reports")
      .update({
        status: "failed",
        error: message,
        model: modelUsed,
        duration_ms: Date.now() - startedAt,
      })
      .eq("id", reportId)

    await supabase
      .from("market_research_settings")
      .update({
        last_run_at: new Date().toISOString(),
        last_run_status: "failed",
        last_run_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)

    return { reportId, status: "failed", error: message }
  }
}
