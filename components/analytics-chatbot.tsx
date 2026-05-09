"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import useSWR from "swr"
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  X,
  MessageCircle,
  AlertTriangle,
} from "lucide-react"
import type { Anomaly } from "@/lib/ads/anomalies"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface AnomaliesResponse {
  anomalies: Anomaly[]
  count: number
  criticalCount: number
}

export function AnalyticsChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Poll anomalies every 60s — surface fresh alerts without spamming the API
  const { data: anomalyData } = useSWR<AnomaliesResponse>("/api/anomalies", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })
  const anomalies = anomalyData?.anomalies ?? []
  const alertCount = anomalies.length
  const criticalCount = anomalyData?.criticalCount ?? 0
  const hasAlerts = alertCount > 0
  const hasCritical = criticalCount > 0

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/analytics-chat" }),
  })

  const isLoading = status === "streaming" || status === "submitted"

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput("")
  }

  // Dynamic suggested questions — surface alert-driven prompts first when alerts exist
  const baseQuestions = [
    "Which platform has the best ROAS?",
    "Which campaigns are unprofitable?",
    "Where should I scale ad spend?",
    "Top campaigns by conversions?",
    "Products to restock?",
  ]
  const alertQuestions = hasAlerts
    ? [
        "What's wrong this week?",
        ...(anomalies[0] ? [`Why did ${anomalies[0].platform} ${anomalies[0].metric.toUpperCase()} drop?`] : []),
        "How do I fix the worst-performing platform?",
      ]
    : []
  const suggestedQuestions = [...alertQuestions, ...baseQuestions].slice(0, 6)

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label={
            hasAlerts
              ? `Open Analytics AI — ${alertCount} alert${alertCount === 1 ? "" : "s"}`
              : "Open Analytics AI"
          }
          className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full text-primary-foreground shadow-lg transition-all hover:scale-105 flex items-center justify-center group ${
            hasCritical
              ? "bg-red-600 hover:bg-red-700"
              : hasAlerts
                ? "bg-amber-500 hover:bg-amber-600"
                : "bg-primary hover:bg-primary/90"
          }`}
        >
          <MessageCircle className="w-6 h-6" />
          {hasAlerts ? (
            <>
              {/* Pulsing ring to draw attention */}
              <span
                className={`absolute inset-0 rounded-full animate-ping opacity-40 ${
                  hasCritical ? "bg-red-500" : "bg-amber-400"
                }`}
              />
              {/* Count badge */}
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-background text-foreground border-2 border-background flex items-center justify-center">
                <span className="text-[10px] font-semibold leading-none">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              </span>
            </>
          ) : (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
          )}
        </button>
      )}

      {/* Floating Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px] max-h-[80vh] bg-card rounded-2xl border border-border/50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-foreground">Analytics AI</h3>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                  </span>
                  <p className="text-xs text-muted-foreground">Connected to data</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Anomaly Alert Banner */}
          {hasAlerts && messages.length === 0 && (
            <div
              className={`px-4 py-3 border-b ${
                hasCritical
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    hasCritical ? "text-red-600" : "text-amber-600"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-medium mb-1.5 ${
                      hasCritical ? "text-red-900" : "text-amber-900"
                    }`}
                  >
                    {alertCount} active alert{alertCount === 1 ? "" : "s"}
                    {hasCritical ? ` — ${criticalCount} critical` : ""}
                  </p>
                  <ul className="space-y-1">
                    {anomalies.slice(0, 2).map((a, i) => (
                      <li
                        key={i}
                        className={`text-[11px] leading-snug ${
                          hasCritical ? "text-red-800" : "text-amber-800"
                        }`}
                      >
                        <span className="font-medium capitalize">{a.platform}</span>{" "}
                        {a.metric.toUpperCase()}{" "}
                        <span className="font-semibold">
                          {(a.changePct * 100).toFixed(0)}%
                        </span>{" "}
                        WoW
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() =>
                      sendMessage({
                        text: "What anomalies are you flagging this week and what should I do about them?",
                      })
                    }
                    className={`mt-2 text-[11px] font-medium underline-offset-2 hover:underline ${
                      hasCritical ? "text-red-700" : "text-amber-700"
                    }`}
                  >
                    Ask AI for full diagnosis →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-medium text-foreground text-sm mb-1">
                  {hasAlerts ? "I've got news for you" : "Ask me anything!"}
                </h4>
                <p className="text-xs text-muted-foreground mb-4">
                  {hasAlerts
                    ? "I'm tracking week-over-week anomalies across your ad platforms."
                    : "I have access to your sales, products, inventory, and competitor data."}
                </p>

                {/* Quick Questions */}
                <div className="w-full space-y-2">
                  {suggestedQuestions.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage({ text: question })}
                      disabled={isLoading}
                      className="w-full text-left px-3 py-2 text-xs bg-muted/50 hover:bg-muted border border-border/50 rounded-lg transition-colors text-foreground disabled:opacity-50"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                      message.role === "user" ? "bg-primary" : "bg-primary/10"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="w-3.5 h-3.5 text-primary-foreground" />
                    ) : (
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {message.parts.map((part, index) => {
                      if (part.type === "text") {
                        return (
                          <div key={index} className="text-xs whitespace-pre-wrap leading-relaxed">
                            {part.text}
                          </div>
                        )
                      }
                      return null
                    })}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border/50 bg-muted/30">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your data..."
                className="flex-1 px-3 py-2.5 bg-card border border-border/50 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
