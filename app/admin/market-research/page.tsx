"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Globe,
  Settings as SettingsIcon,
  X,
  Plus,
} from "lucide-react"

type Settings = {
  id: number
  enabled: boolean
  business_context: string
  research_topics: string[]
  schedule_hour: number
  schedule_timezone: string
  last_run_at: string | null
  last_run_status: string | null
  last_run_error: string | null
}

type Insight = {
  title: string
  detail: string
  category: string
  relevance: "high" | "medium" | "low"
}

type Source = { url: string; title: string }

type Report = {
  id: string
  created_at: string
  trigger_type: string
  status: "pending" | "success" | "failed"
  headline: string | null
  summary: string | null
  insights: Insight[]
  recommendations: string[]
  topics: string[]
  sources: Source[]
  model: string | null
  duration_ms: number | null
  error: string | null
}

const RELEVANCE_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
}

const CATEGORY_STYLES: Record<string, string> = {
  industry: "bg-blue-50 text-blue-700",
  competitor: "bg-purple-50 text-purple-700",
  ingredient: "bg-green-50 text-green-700",
  trend: "bg-pink-50 text-pink-700",
  platform: "bg-indigo-50 text-indigo-700",
  regulation: "bg-orange-50 text-orange-700",
  other: "bg-slate-100 text-slate-600",
}

export default function MarketResearchPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [newTopic, setNewTopic] = useState("")
  const [contextDraft, setContextDraft] = useState("")
  const [topicsDraft, setTopicsDraft] = useState<string[]>([])
  const [scheduleHourDraft, setScheduleHourDraft] = useState(8)

  useEffect(() => {
    loadAll()
    // No polling — use the Refresh button to reload reports.
  }, [])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadSettings(), loadReports()])
    setLoading(false)
  }

  async function loadSettings() {
    try {
      const res = await fetch("/api/market-research/settings", { cache: "no-store" })
      const data = await res.json()
      if (data.settings) {
        setSettings(data.settings)
        setContextDraft(data.settings.business_context || "")
        setTopicsDraft(data.settings.research_topics || [])
        setScheduleHourDraft(data.settings.schedule_hour ?? 8)
      }
    } catch (err) {
      console.error("[v0] load settings failed:", err)
    }
  }

  async function loadReports() {
    try {
      const res = await fetch("/api/market-research/reports?limit=30", {
        cache: "no-store",
      })
      const data = await res.json()
      setReports(data.reports || [])
    } catch (err) {
      console.error("[v0] load reports failed:", err)
    }
  }

  async function handleToggle(enabled: boolean) {
    setSettings((prev) => (prev ? { ...prev, enabled } : prev))
    try {
      const res = await fetch("/api/market-research/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      })
      const data = await res.json()
      if (data.settings) setSettings(data.settings)
    } catch (err) {
      console.error("[v0] toggle failed:", err)
      loadSettings()
    }
  }

  async function handleRunNow() {
    setRunning(true)
    setRunError(null)
    // Optimistically add a pending placeholder so the user sees activity
    const placeholderId = `pending-${Date.now()}`
    setReports((prev) => [
      {
        id: placeholderId,
        created_at: new Date().toISOString(),
        trigger_type: "manual",
        status: "pending",
        headline: null,
        summary: null,
        insights: [],
        recommendations: [],
        topics: [],
        sources: [],
        model: null,
        duration_ms: null,
        error: null,
      },
      ...prev,
    ])

    try {
      const res = await fetch("/api/market-research/run", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Research failed")
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Research failed")
    } finally {
      setRunning(false)
      // Drop the placeholder + reload from DB
      setReports((prev) => prev.filter((r) => r.id !== placeholderId))
      loadReports()
      loadSettings()
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true)
    try {
      const res = await fetch("/api/market-research/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_context: contextDraft,
          research_topics: topicsDraft,
          schedule_hour: scheduleHourDraft,
        }),
      })
      const data = await res.json()
      if (data.settings) {
        setSettings(data.settings)
        setShowSettings(false)
      }
    } catch (err) {
      console.error("[v0] save settings failed:", err)
    } finally {
      setSavingSettings(false)
    }
  }

  function addTopic() {
    const t = newTopic.trim()
    if (!t || topicsDraft.includes(t)) return
    setTopicsDraft([...topicsDraft, t])
    setNewTopic("")
  }

  function nextRunDescription() {
    if (!settings || !settings.enabled) return null
    return `Daily at ${String(settings.schedule_hour).padStart(2, "0")}:00 (${settings.schedule_timezone})`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border/50 sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/admin"
                className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="min-w-0">
                <h1 className="font-serif text-xl text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Market Research Agent
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Autonomous AI agent that searches the web every morning for industry news, competitor moves, and trends
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowSettings((v) => !v)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm border border-border/60 hover:bg-muted/60 transition-colors"
              >
                <SettingsIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Configure</span>
              </button>
              <button
                type="button"
                onClick={handleRunNow}
                disabled={running}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed font-medium"
              >
                {running ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Researching...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Run now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Status panel */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {/* Toggle card */}
          <div className="md:col-span-2 bg-card border border-border/60 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Auto-research status
                </p>
                <h2 className="font-serif text-2xl text-foreground">
                  {settings?.enabled ? "Agent is active" : "Agent is off"}
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {settings?.enabled
                    ? `The agent will run automatically. ${nextRunDescription()}`
                    : "Turn on the agent to receive a fresh briefing every morning. Off by default to control AI usage."}
                </p>
              </div>
              {/* Big toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={settings?.enabled || false}
                onClick={() => handleToggle(!settings?.enabled)}
                disabled={!settings || loading}
                className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                  settings?.enabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${
                    settings?.enabled ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Last run card */}
          <div className="bg-card border border-border/60 rounded-2xl p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Last run
            </p>
            {settings?.last_run_at ? (
              <>
                <div className="flex items-center gap-2">
                  {settings.last_run_status === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium text-foreground capitalize">
                    {settings.last_run_status || "unknown"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {new Date(settings.last_run_at).toLocaleString()}
                </p>
                {settings.last_run_error && (
                  <p className="text-xs text-red-600 mt-2 line-clamp-2">
                    {settings.last_run_error}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No runs yet</p>
            )}
          </div>
        </div>

        {/* Settings drawer */}
        {showSettings && settings && (
          <div className="bg-card border border-border/60 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg text-foreground">Configure agent</h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Business context
                </label>
                <textarea
                  value={contextDraft}
                  onChange={(e) => setContextDraft(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Describe your business: category, target market, channels, USP..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The agent uses this to filter what's relevant to your business.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Research topics
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {topicsDraft.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted text-foreground border border-border/60"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() =>
                          setTopicsDraft(topicsDraft.filter((x) => x !== t))
                        }
                        className="opacity-60 hover:opacity-100 hover:text-red-600"
                        aria-label={`Remove ${t}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addTopic()
                      }
                    }}
                    placeholder="Add a topic, e.g. 'oat skincare ingredient research'"
                    maxLength={200}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={addTopic}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-muted text-foreground text-sm hover:bg-muted/70 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Run hour (in {settings.schedule_timezone})
                </label>
                <select
                  value={scheduleHourDraft}
                  onChange={(e) => setScheduleHourDraft(parseInt(e.target.value, 10))}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors font-medium"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 rounded-full text-sm hover:bg-muted/60 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Run error */}
        {runError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">Research run failed</p>
              <p className="text-xs text-red-600 mt-1">{runError}</p>
            </div>
          </div>
        )}

        {/* Reports */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-foreground">Briefings</h2>
          <button
            type="button"
            onClick={loadReports}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        {loading && reports.length === 0 ? (
          <div className="bg-card border border-border/60 rounded-2xl p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-3">Loading briefings...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-card border border-border/60 rounded-2xl p-12 text-center">
            <Globe className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-serif text-lg text-foreground">No briefings yet</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Click "Run now" to generate your first briefing, or turn on the agent to
              get one automatically every morning.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                expanded={expandedId === report.id}
                onToggle={() =>
                  setExpandedId(expandedId === report.id ? null : report.id)
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ReportCard({
  report,
  expanded,
  onToggle,
}: {
  report: Report
  expanded: boolean
  onToggle: () => void
}) {
  const date = new Date(report.created_at)
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
  const timeLabel = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <article
      className={`bg-card border rounded-2xl overflow-hidden transition-colors ${
        report.status === "failed"
          ? "border-red-200"
          : "border-border/60 hover:border-border"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-6 flex items-start gap-4"
      >
        <div className="shrink-0 mt-1">
          {report.status === "pending" ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : report.status === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {dateLabel} · {timeLabel}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              {report.trigger_type === "scheduled" ? (
                <>
                  <Clock className="w-3 h-3" />
                  Scheduled
                </>
              ) : (
                "Manual"
              )}
            </span>
            {report.duration_ms && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {(report.duration_ms / 1000).toFixed(1)}s
                </span>
              </>
            )}
          </div>

          {report.status === "pending" ? (
            <p className="font-serif text-base text-foreground">
              Researching the web...
            </p>
          ) : report.status === "failed" ? (
            <>
              <p className="font-serif text-base text-foreground">Run failed</p>
              {report.error && (
                <p className="text-sm text-red-600 mt-1 line-clamp-2">{report.error}</p>
              )}
            </>
          ) : (
            <>
              <h3 className="font-serif text-lg text-foreground leading-tight text-pretty">
                {report.headline || "Untitled briefing"}
              </h3>
              {report.summary && !expanded && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                  {report.summary}
                </p>
              )}
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                <span>{report.insights.length} insights</span>
                <span>·</span>
                <span>{report.sources.length} sources</span>
                {report.topics.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="truncate">
                      {report.topics.slice(0, 3).join(", ")}
                      {report.topics.length > 3 && "..."}
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {report.status === "success" && (
          <div className="shrink-0 text-muted-foreground">
            {expanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>
        )}
      </button>

      {expanded && report.status === "success" && (
        <div className="px-6 pb-6 border-t border-border/40 pt-6 space-y-6">
          {/* Summary */}
          {report.summary && (
            <div>
              <p className="text-sm text-foreground leading-relaxed">{report.summary}</p>
            </div>
          )}

          {/* Insights */}
          {report.insights.length > 0 && (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Insights
              </h4>
              <div className="space-y-3">
                {report.insights.map((insight, i) => (
                  <div
                    key={i}
                    className="border border-border/60 rounded-xl p-4 bg-background/50"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h5 className="text-sm font-medium text-foreground text-pretty">
                        {insight.title}
                      </h5>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            CATEGORY_STYLES[insight.category] || CATEGORY_STYLES.other
                          }`}
                        >
                          {insight.category}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                            RELEVANCE_STYLES[insight.relevance]
                          }`}
                        >
                          {insight.relevance}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {insight.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Recommendations
              </h4>
              <ul className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-foreground leading-relaxed"
                  >
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium mt-0.5">
                      {i + 1}
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sources */}
          {report.sources.length > 0 && (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Sources ({report.sources.length})
              </h4>
              <ul className="space-y-1.5">
                {report.sources.map((source, i) => (
                  <li key={i}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-start gap-1.5 text-sm text-primary hover:underline group"
                    >
                      <ExternalLink className="w-3 h-3 mt-1 shrink-0 opacity-60 group-hover:opacity-100" />
                      <span className="text-pretty">{source.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.model && (
            <p className="text-[10px] text-muted-foreground border-t border-border/30 pt-3">
              Generated by {report.model}
            </p>
          )}
        </div>
      )}
    </article>
  )
}
