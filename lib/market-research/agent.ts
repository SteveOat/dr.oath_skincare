import { generateText, Output, stepCountIs, tool } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

/**
 * Market Research Agent
 * ---------------------
 * Real AI agent that uses the same Vercel AI Gateway routing as the analytics
 * chatbot (zero-config `openai/gpt-5-mini`). Web search is performed via a
 * custom tool that wraps Tavily when `TAVILY_API_KEY` is configured, otherwise
 * the agent falls back to its training data and clearly notes the limitation
 * in the generated briefing.
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
 * Build a web-search tool. When `TAVILY_API_KEY` is set, real search is
 * performed. When not, the tool returns a clear "search disabled" message so
 * the agent knows to rely on its training data and the user knows to add a
 * key to enable live research.
 *
 * Sources are collected via closure so we can attach them to the final
 * report.
 */
function makeWebSearchTool(collected: CollectedSource[]) {
  return tool({
    description:
      "Search the public web for current news, articles, competitor moves, regulations, and trends. Returns titles, URLs, and short content snippets. Use multiple targeted searches with specific queries (mention brand names, products, dates) rather than vague single queries.",
    inputSchema: z.object({
      query: z.string().describe("The search query — be specific."),
      max_results: z
        .number()
        .int()
        .min(3)
        .max(8)
        .default(5)
        .describe("How many results to return."),
    }),
    execute: async ({ query, max_results }) => {
      const tavilyKey = process.env.TAVILY_API_KEY
      if (!tavilyKey) {
        return {
          ok: false,
          error:
            "Live web search is not configured. Add TAVILY_API_KEY to enable real-time research. For this run, rely on your training data and clearly note in the briefing that findings may be outdated.",
          query,
          results: [],
        }
      }

      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query,
            max_results,
            search_depth: "basic",
            include_answer: false,
            include_raw_content: false,
          }),
        })

        if (!res.ok) {
          return {
            ok: false,
            error: `Tavily search failed: ${res.status} ${res.statusText}`,
            query,
            results: [],
          }
        }

        const data = (await res.json()) as {
          results?: Array<{ title?: string; url?: string; content?: string }>
        }

        const results = (data.results || []).map((r) => ({
          title: r.title || r.url || "Source",
          url: r.url || "",
          snippet: (r.content || "").slice(0, 600),
        }))

        // Side-effect: collect for final source list
        for (const r of results) {
          if (r.url && !collected.find((c) => c.url === r.url)) {
            collected.push({ url: r.url, title: r.title })
          }
        }

        return { ok: true, query, results }
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Search request failed",
          query,
          results: [],
        }
      }
    },
  })
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
  const hasLiveSearch = !!process.env.TAVILY_API_KEY

  const systemPrompt = `You are a senior market research analyst working for an e-commerce business.
${hasLiveSearch ? "You have access to a live web_search tool." : "Web search is currently DISABLED. Rely on your training data and clearly state in the briefing that some findings may be outdated."}
Today's date is ${today}.

Your job is to:
1. ${hasLiveSearch ? "Run multiple targeted web searches across the topic list" : "Use your training knowledge to summarize what's likely current"}
2. ${hasLiveSearch ? "Prefer sources from the last 7-14 days" : "Lean on the most stable, well-known industry knowledge"}
3. Synthesize findings into a structured intelligence briefing
4. ${hasLiveSearch ? "Ground every insight in a real source you found via web search" : "Be honest about what you don't know — flag uncertain claims"}
5. Be specific — name competitors, products, prices, percentages, dates whenever possible
6. Skip generic advice; only include insights you can defend

Business context:
${businessContext}

Research topics for today's briefing:
${topicList || "(no topics configured — use general industry research)"}`

  const userPrompt = `Produce today's market research briefing.

${hasLiveSearch ? "Run multiple targeted web searches across the topic list. Then synthesize the findings into the structured report. If a topic returns nothing meaningful, skip it rather than padding." : "Produce the briefing from your training data. In the executive summary, briefly note that live web search was not available for this run."}`

  const collectedSources: CollectedSource[] = []
  const modelId = "openai/gpt-5-mini"

  try {
    const result = await generateText({
      // Vercel AI Gateway routing — same zero-config pattern as the chatbot.
      model: modelId,
      tools: hasLiveSearch
        ? { web_search: makeWebSearchTool(collectedSources) }
        : undefined,
      maxRetries: 1,
      stopWhen: stepCountIs(10),
      system: systemPrompt,
      prompt: userPrompt,
      experimental_output: Output.object({ schema: ReportSchema }),
    })

    const report = result.experimental_output as ResearchReport

    // Deduplicate sources by URL (already deduped during collection, but be safe)
    const seen = new Set<string>()
    const uniqueSources = collectedSources.filter((s) => {
      if (seen.has(s.url)) return false
      seen.add(s.url)
      return true
    })

    const modelUsed = hasLiveSearch
      ? `${modelId} + tavily web search`
      : `${modelId} (no web search — TAVILY_API_KEY not set)`

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
        model: modelId,
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
