"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import useSWR from "swr"
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  RefreshCw,
  History,
  Trash2,
  MessageSquare,
} from "lucide-react"
import type { Anomaly } from "@/lib/ads/anomalies"
import {
  type ChatSession,
  deleteSession,
  deriveTitle,
  loadSessions,
  newSessionId,
  saveSession,
  subscribeToSessions,
} from "@/lib/chat-history"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface AnomaliesResponse {
  anomalies: Anomaly[]
  count: number
  criticalCount: number
}

export default function FullScreenChatPage() {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [followUps, setFollowUps] = useState<string[]>([])
  const [followUpsLoading, setFollowUpsLoading] = useState(false)
  const [followUpsForMessageId, setFollowUpsForMessageId] = useState<string | null>(null)
  // Chat session persistence — synced with the floating widget via localStorage.
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [sessionId, setSessionId] = useState<string>(() => newSessionId())
  const [sessionCreatedAt, setSessionCreatedAt] = useState<number>(() => Date.now())
  const savedForMessageIdRef = useRef<string | null>(null)

  const { data: anomaliesData } = useSWR<AnomaliesResponse>(
    "/api/anomalies",
    fetcher,
    { refreshInterval: 60_000 },
  )
  const anomalies = anomaliesData?.anomalies ?? []
  const alertCount = anomaliesData?.count ?? 0
  const criticalCount = anomaliesData?.criticalCount ?? 0
  const hasAlerts = alertCount > 0
  const hasCritical = criticalCount > 0

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/analytics-chat" }),
  })

  const isLoading = status === "submitted" || status === "streaming"

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, followUps])

  // Load sessions list on mount and subscribe to changes (cross-tab + widget)
  useEffect(() => {
    setSessions(loadSessions())
    const unsubscribe = subscribeToSessions(() => {
      setSessions(loadSessions())
    })
    return unsubscribe
  }, [])

  // Persist current conversation after each assistant turn completes
  useEffect(() => {
    if (status !== "ready") return
    if (messages.length === 0) return
    const last = messages[messages.length - 1]
    if (last.role !== "assistant") return
    if (savedForMessageIdRef.current === last.id) return
    savedForMessageIdRef.current = last.id

    const next = saveSession({
      id: sessionId,
      title: deriveTitle(messages),
      messages,
      createdAt: sessionCreatedAt,
      updatedAt: Date.now(),
    })
    setSessions(next)
  }, [status, messages, sessionId, sessionCreatedAt])

  const getMessageText = (msg: (typeof messages)[number]): string =>
    (msg.parts || [])
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("")

  // Fetch contextual follow-ups after each assistant turn
  useEffect(() => {
    if (status !== "ready") return
    if (messages.length === 0) return

    const last = messages[messages.length - 1]
    if (last.role !== "assistant") return
    if (followUpsForMessageId === last.id) return

    const lastText = getMessageText(last).trim()
    if (!lastText) return

    let cancelled = false
    setFollowUpsLoading(true)
    setFollowUps([])
    setFollowUpsForMessageId(last.id)

    const transcript = messages.map((m) => ({
      role: m.role,
      content: getMessageText(m),
    }))

    fetch("/api/analytics-chat/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: transcript }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const list: string[] = Array.isArray(data?.suggestions) ? data.suggestions : []
        setFollowUps(list.slice(0, 3))
      })
      .catch(() => {
        if (!cancelled) setFollowUps([])
      })
      .finally(() => {
        if (!cancelled) setFollowUpsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [status, messages, followUpsForMessageId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    setFollowUps([])
    setFollowUpsForMessageId(null)
    sendMessage({ text: input })
    setInput("")
  }

  const handleQuickSend = (text: string) => {
    if (isLoading) return
    setFollowUps([])
    setFollowUpsForMessageId(null)
    sendMessage({ text })
  }

  const handleNewChat = () => {
    setMessages([])
    setFollowUps([])
    setFollowUpsForMessageId(null)
    setInput("")
    setSessionId(newSessionId())
    setSessionCreatedAt(Date.now())
    savedForMessageIdRef.current = null
  }

  const handleLoadSession = (s: ChatSession) => {
    if (isLoading) return
    if (s.id === sessionId) return
    setMessages(s.messages as never)
    setSessionId(s.id)
    setSessionCreatedAt(s.createdAt)
    setFollowUps([])
    setFollowUpsForMessageId(null)
    setInput("")
    // Mark the latest assistant message as already saved so we don't immediately re-save on load
    const lastAssistant = [...s.messages].reverse().find((m) => m.role === "assistant")
    savedForMessageIdRef.current = lastAssistant?.id ?? null
  }

  const handleDeleteSession = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const next = deleteSession(id)
    setSessions(next)
    // If we just deleted the active session, start a fresh one
    if (id === sessionId) {
      handleNewChat()
    }
  }

  const categories = [
    {
      title: "Ads & ROAS",
      icon: TrendingUp,
      questions: [
        "Which platform has the best ROAS?",
        "Which campaigns are unprofitable?",
        "Where should I scale ad spend?",
      ],
    },
    {
      title: "Revenue",
      icon: DollarSign,
      questions: [
        "What is our overall ROAS?",
        "Show me revenue trends",
        "What is our best seller?",
      ],
    },
    {
      title: "Inventory",
      icon: Package,
      questions: [
        "Products to restock?",
        "What stock levels look risky?",
        "Show me inventory status",
      ],
    },
    {
      title: "Customers",
      icon: Users,
      questions: [
        "Any urgent customer messages?",
        "What is conversion rate?",
        "Top customer pain points?",
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/admin"
              className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-foreground truncate">Analytics AI</h1>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
                <p className="text-xs text-muted-foreground">
                  Connected to all data sources
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleNewChat}
            disabled={messages.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-full hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-3 h-3" />
            New chat
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto">
          {hasAlerts && (
            <div
              className={`rounded-xl border p-4 ${
                hasCritical
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle
                  className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    hasCritical ? "text-red-600" : "text-amber-600"
                  }`}
                />
                <div>
                  <p
                    className={`text-xs font-semibold ${
                      hasCritical ? "text-red-900" : "text-amber-900"
                    }`}
                  >
                    {alertCount} active alert{alertCount === 1 ? "" : "s"}
                  </p>
                  {hasCritical && (
                    <p className="text-[10px] text-red-700 mt-0.5">
                      {criticalCount} critical
                    </p>
                  )}
                </div>
              </div>
              <ul className="space-y-1.5 mb-3">
                {anomalies.slice(0, 3).map((a, i) => (
                  <li
                    key={i}
                    className={`text-[11px] leading-tight ${
                      hasCritical ? "text-red-800" : "text-amber-800"
                    }`}
                  >
                    • {a.message}
                  </li>
                ))}
              </ul>
              <button
                onClick={() =>
                  handleQuickSend(
                    "What anomalies are you flagging this week and what should I do?",
                  )
                }
                className={`text-[11px] font-medium underline-offset-2 hover:underline ${
                  hasCritical ? "text-red-700" : "text-amber-700"
                }`}
              >
                Get full diagnosis →
              </button>
            </div>
          )}

          {/* Recent chat history */}
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Recent chats
                </h3>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {sessions.length}/5
              </span>
            </div>

            {sessions.length === 0 ? (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your latest 5 conversations will appear here.
              </p>
            ) : (
              <ul className="space-y-1">
                {sessions.map((s) => {
                  const isActive = s.id === sessionId
                  const date = new Date(s.updatedAt)
                  const now = new Date()
                  const isToday =
                    date.getFullYear() === now.getFullYear() &&
                    date.getMonth() === now.getMonth() &&
                    date.getDate() === now.getDate()
                  const stamp = isToday
                    ? date.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : date.toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })
                  const turns = s.messages.filter((m) => m.role === "user").length

                  return (
                    <li key={s.id} className="relative group">
                      <button
                        onClick={() => handleLoadSession(s)}
                        disabled={isLoading}
                        className={`w-full flex items-start gap-2 pl-2 pr-7 py-2 rounded-md text-left transition-colors disabled:opacity-50 ${
                          isActive
                            ? "bg-primary/10 hover:bg-primary/15"
                            : "hover:bg-muted"
                        }`}
                      >
                        <MessageSquare
                          className={`w-3 h-3 mt-0.5 flex-shrink-0 ${
                            isActive ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs leading-tight truncate ${
                              isActive
                                ? "text-foreground font-medium"
                                : "text-foreground/90"
                            }`}
                          >
                            {s.title || deriveTitle(s.messages)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {stamp} · {turns} turn{turns === 1 ? "" : "s"}
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(s.id, e)}
                        aria-label="Delete chat"
                        title="Delete chat"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {categories.map((cat) => {
            const Icon = cat.icon
            return (
              <div key={cat.title} className="bg-card border border-border/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    {cat.title}
                  </h3>
                </div>
                <div className="space-y-1.5">
                  {cat.questions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickSend(q)}
                      disabled={isLoading}
                      className="w-full text-left text-xs text-foreground/80 hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </aside>

        {/* Main chat */}
        <main className="flex flex-col bg-card border border-border/50 rounded-2xl overflow-hidden min-h-[calc(100vh-7rem)]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2 text-balance">
                  Ask anything about your business
                </h2>
                <p className="text-sm text-muted-foreground mb-6 text-pretty">
                  I have full access to your analytics, ad performance, inventory,
                  competitors, and customer messages. Ask me anything.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  {[
                    "Which platform has the best ROAS?",
                    "Where should I scale ad spend?",
                    "What is our overall ROAS?",
                    "Products to restock?",
                  ].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickSend(q)}
                      disabled={isLoading}
                      className="text-left text-xs px-3 py-2.5 bg-muted/50 hover:bg-muted border border-border/50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                      message.role === "user" ? "bg-foreground" : "bg-primary/10"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="w-4 h-4 text-background" />
                    ) : (
                      <Bot className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-foreground text-background"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.parts?.map((part, i) =>
                        part.type === "text" ? (
                          <span key={i}>{part.text}</span>
                        ) : null,
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}

            {!isLoading &&
              messages.length > 0 &&
              messages[messages.length - 1].role === "assistant" && (
                <div className="pl-11 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {followUpsLoading ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Thinking of follow-ups...</span>
                    </div>
                  ) : followUps.length > 0 ? (
                    <>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium">
                        Continue the conversation
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {followUps.map((q, i) => (
                          <button
                            key={`${followUpsForMessageId}-${i}`}
                            onClick={() => handleQuickSend(q)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 rounded-full text-foreground/90 hover:text-foreground transition-colors disabled:opacity-50"
                          >
                            <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
                            <span>{q}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border/50 p-4 bg-card">
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your business..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 text-sm bg-muted/50 border border-border/50 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground transition-colors flex items-center justify-center flex-shrink-0"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[10px] text-muted-foreground/70 text-center mt-2">
              Real-time data from Supabase. Press / to focus.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
