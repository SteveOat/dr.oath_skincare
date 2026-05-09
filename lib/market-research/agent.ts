import { generateText, Output } from "ai"
import { xai, type XaiLanguageModelChatOptions } from "@ai-sdk/xai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

/**
 * Market Research Agent
 * ---------------------
 * Real AI agent powered by xAI Grok with native Live Search (web + news + X).
 * Search runs server-side at xAI — no Tavily/external search service needed.
 * Authenticates with `XAI_API_KEY`.
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

type CollectedSource = { url: string; title: string }

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
  // grok-3 is the most stable Live-Search-capable model.
  // grok-4.x introduces breaking changes that some accounts don't have access to (returns 410).
  const searchModelId = "grok-3"
  const synthModelId = "grok-3"

  if (!process.env.XAI_API_KEY) {
    const message =
      "XAI_API_KEY is not set. Add it in the project's Vars panel — Grok powers the agent's live web search."
    await supabase
      .from("market_research_reports")
      .update({
        status: "failed",
        error: message,
        model: `xai/${searchModelId}`,
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

  // Live Search date window: prefer the last 14 days for "what's new"
  const now = new Date()
  const fromDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const toDate = now.toISOString().slice(0, 10)

  const searchSystemPrompt = `You are a senior market research analyst with native access to Live Search across the open web, news outlets, and X (Twitter).
Today's date is ${today}.

Business context:
${businessContext}

Research topics:
${topicList || "(no topics configured — use general industry research)"}

Your task right now: gather the most material, recent (last 14 days) intelligence across these topics. Write a thorough markdown research brief covering:
- Competitor moves (launches, pricing, marketing pivots)
- Industry trend shifts (ingredients, regulations, consumer demand)
- Channel insights (which platforms are buzzing right now)
- Concrete opportunities and risks

Be specific — name competitors, products, prices, percentages, dates wherever possible. Cite sources inline. Skip topics that returned nothing meaningful rather than padding. Aim for 400-800 words of dense, source-backed analysis.`

  const searchUserPrompt = `Run live searches and produce today's market research briefing.`

  try {
    // STEP 1 — Live Search + free-form research
    // Live Search returns sources via providerOptions.xai.searchParameters
    const research = await generateText({
      model: xai(searchModelId),
      system: searchSystemPrompt,
      prompt: searchUserPrompt,
      maxRetries: 1,
      providerOptions: {
        xai: {
          searchParameters: {
            mode: "on",
            returnCitations: true,
            maxSearchResults: 20,
            fromDate,
            toDate,
            sources: [
              { type: "web", safeSearch: true },
              { type: "news", safeSearch: true },
              { type: "x", postFavoriteCount: 50 },
            ],
          },
        } satisfies XaiLanguageModelChatOptions,
      },
    })

    const rawBriefing = research.text

    // Extract real source URLs from Grok Live Search citations, deduplicated
    const collectedSources: CollectedSource[] = []
    const seen = new Set<string>()
    for (const s of research.sources || []) {
      if (s.sourceType === "url" && s.url && !seen.has(s.url)) {
        seen.add(s.url)
        let title = s.title
        if (!title) {
          try {
            title = new URL(s.url).hostname
          } catch {
            title = s.url
          }
        }
        collectedSources.push({ url: s.url, title })
      }
    }

    // STEP 2 — Structure the free-form briefing into the report schema
    const sourceLines =
      collectedSources.length > 0
        ? collectedSources
            .map((s, i) => `${i + 1}. ${s.title} — ${s.url}`)
            .join("\n")
        : "(no sources collected from Live Search)"

    const synth = await generateText({
      model: xai(synthModelId),
      system: `You convert a free-form market research briefing into a structured JSON report. Preserve every concrete fact, name, price, and date from the source material. Reference sources by URL when relevant.`,
      prompt: `Source briefing (with embedded citations):

${rawBriefing}

Sources discovered during Live Search:
${sourceLines}

Convert this into the structured report. Insights should be the 3-8 most material findings ordered by relevance. Recommendations should be 2-5 concrete actions the business should take this week.`,
      maxRetries: 1,
      experimental_output: Output.object({ schema: ReportSchema }),
    })

    const report = synth.experimental_output as ResearchReport

    await supabase
      .from("market_research_reports")
      .update({
        status: "success",
        headline: report.headline,
        summary: report.summary,
        insights: report.insights,
        recommendations: report.recommendations,
        topics: report.topics,
        sources: collectedSources,
        raw_text: rawBriefing || null,
        model: `xai/${searchModelId} + Live Search`,
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
    const rawMessage = error instanceof Error ? error.message : "Unknown error"
    // Detect common xAI auth/credit failures and surface a more actionable message.
    let message = rawMessage
    const lower = rawMessage.toLowerCase()
    if (
      lower.includes("incorrect api key") ||
      lower.includes("bad credentials") ||
      lower.includes("invalid api key") ||
      lower.includes("unauthenticated")
    ) {
      message = `Your XAI_API_KEY is invalid. xAI keys start with "xai-" and come from https://console.x.ai. Update the value in the project's Vars panel and try again. (xAI said: ${rawMessage})`
    } else if (lower.includes("gone") || lower.includes("410")) {
      message = `xAI rejected the request — your account may not have access to model "${searchModelId}", or your API key is invalid. Verify the key at https://console.x.ai. (raw: ${rawMessage})`
    } else if (lower.includes("insufficient") && lower.includes("credit")) {
      message = `Your xAI account is out of credits. Top up at https://console.x.ai. (raw: ${rawMessage})`
    }
    console.error("[market-research] Agent failed:", message)

    await supabase
      .from("market_research_reports")
      .update({
        status: "failed",
        error: message,
        model: `xai/${searchModelId}`,
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
