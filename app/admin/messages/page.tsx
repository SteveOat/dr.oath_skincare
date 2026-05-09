"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  ArrowLeft,
  Search,
  Send,
  Inbox,
  Facebook,
  Instagram,
  MessageCircle,
  Mail,
  Globe,
  AlertCircle,
  CheckCheck,
  Tag,
  RefreshCw,
} from "lucide-react"

type Channel = "facebook" | "line" | "instagram" | "email" | "web"

interface Conversation {
  id: string
  channel: Channel
  customer_external_id: string
  customer_name: string
  customer_avatar_url: string | null
  status: "open" | "pending" | "resolved" | "archived"
  priority: "low" | "normal" | "high" | "urgent"
  last_message_at: string
  last_message_preview: string
  unread_count: number
  tags: string[]
}

interface ChannelConnection {
  channel: Channel
  display_name: string
  is_connected: boolean
  account_handle: string | null
  last_sync_at: string | null
}

interface Message {
  id: string
  direction: "inbound" | "outbound"
  sender_type: "customer" | "agent" | "bot" | "system"
  sender_name: string
  content: string
  created_at: string
}

const CHANNEL_META: Record<Channel, { label: string; icon: any; color: string; bg: string }> = {
  facebook: { label: "Facebook", icon: Facebook, color: "text-[#1877F2]", bg: "bg-[#1877F2]/10" },
  line: { label: "LINE", icon: MessageCircle, color: "text-[#06C755]", bg: "bg-[#06C755]/10" },
  instagram: { label: "Instagram", icon: Instagram, color: "text-[#E4405F]", bg: "bg-[#E4405F]/10" },
  email: { label: "Email", icon: Mail, color: "text-amber-600", bg: "bg-amber-50" },
  web: { label: "Web Chat", icon: Globe, color: "text-slate-600", bg: "bg-slate-100" },
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [channels, setChannels] = useState<ChannelConnection[]>([])
  const [usingMock, setUsingMock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeChannel, setActiveChannel] = useState<Channel | "all">("all")
  const [search, setSearch] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  async function loadConversations() {
    try {
      const res = await fetch("/api/messages/conversations", { cache: "no-store" })
      const data = await res.json()
      setConversations(data.conversations || [])
      setChannels(data.channels || [])
      setUsingMock(!!data.usingMock)
      if (!activeId && data.conversations?.length) {
        setActiveId(data.conversations[0].id)
      }
    } catch (err) {
      console.error("[v0] load conversations failed:", err)
    } finally {
      setLoading(false)
    }
  }

  async function loadThread(id: string) {
    try {
      const res = await fetch(`/api/messages/${id}`, { cache: "no-store" })
      const data = await res.json()
      setMessages(data.messages || [])
      requestAnimationFrame(() => {
        threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" })
      })
    } catch (err) {
      console.error("[v0] load thread failed:", err)
    }
  }

  useEffect(() => {
    loadConversations()
    // Poll fallback when not using Supabase realtime (mock data)
    const interval = setInterval(loadConversations, 15000)

    // Supabase realtime subscription for live message updates
    const supabase = createClient()
    const channel = supabase
      .channel("messages-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => loadConversations(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "customer_messages" },
        (payload: any) => {
          if (payload?.new?.conversation_id === activeId) {
            loadThread(activeId)
          }
          loadConversations()
        },
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  useEffect(() => {
    if (activeId) loadThread(activeId)
  }, [activeId])

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (activeChannel !== "all" && c.channel !== activeChannel) return false
      if (search && !c.customer_name.toLowerCase().includes(search.toLowerCase()) && !c.last_message_preview.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [conversations, activeChannel, search])

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: 0, facebook: 0, line: 0, instagram: 0, email: 0, web: 0 }
    conversations.forEach((c) => {
      map.all += c.unread_count
      map[c.channel] = (map[c.channel] || 0) + c.unread_count
    })
    return map
  }, [conversations])

  const activeConv = conversations.find((c) => c.id === activeId)

  async function handleSend() {
    if (!reply.trim() || !activeId || sending) return
    setSending(true)
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      direction: "outbound",
      sender_type: "agent",
      sender_name: "Support Team",
      content: reply.trim(),
      created_at: new Date().toISOString(),
    }
    setMessages((m) => [...m, optimistic])
    const text = reply
    setReply("")
    try {
      await fetch(`/api/messages/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      })
    } catch (err) {
      console.error("[v0] send failed:", err)
    } finally {
      setSending(false)
      requestAnimationFrame(() => {
        threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" })
      })
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <div className="h-6 w-px bg-border/60" />
            <div>
              <h1 className="font-serif text-2xl text-foreground">Customer Communications</h1>
              <p className="text-sm text-muted-foreground">Unified inbox across all channels</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {usingMock && (
              <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full">Demo Data</span>
            )}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-medium text-green-700">Live</span>
            </div>
            <button
              onClick={loadConversations}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Layout: 3 columns */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto grid grid-cols-1 md:grid-cols-[260px_360px_1fr] gap-0 min-h-0">
        {/* Channels sidebar */}
        <aside className="border-r border-border/50 bg-card/50 p-4 hidden md:block">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Channels</h2>
          <button
            onClick={() => setActiveChannel("all")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors ${
              activeChannel === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted/60 text-foreground"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Inbox className="w-4 h-4" />
              All Inboxes
            </span>
            {counts.all > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeChannel === "all" ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"}`}>
                {counts.all}
              </span>
            )}
          </button>

          <div className="my-3 border-t border-border/50" />

          {channels.map((ch) => {
            const meta = CHANNEL_META[ch.channel]
            const Icon = meta.icon
            const isActive = activeChannel === ch.channel
            return (
              <button
                key={ch.channel}
                onClick={() => setActiveChannel(ch.channel)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted/60 text-foreground"
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-7 h-7 rounded-md ${isActive ? "bg-primary-foreground/15" : meta.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${isActive ? "text-primary-foreground" : meta.color}`} />
                  </span>
                  <span className="flex flex-col items-start min-w-0">
                    <span className="truncate max-w-[140px]">{meta.label}</span>
                    {ch.account_handle && (
                      <span className={`text-[10px] truncate max-w-[140px] ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {ch.account_handle}
                      </span>
                    )}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {!ch.is_connected && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-amber-300" : "bg-amber-500"}`} title="Not connected" />
                  )}
                  {counts[ch.channel] > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"}`}>
                      {counts[ch.channel]}
                    </span>
                  )}
                </span>
              </button>
            )
          })}

          <div className="my-3 border-t border-border/50" />
          <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted/60 transition-colors">
            + Add channel
          </button>
        </aside>

        {/* Conversation list */}
        <section className="border-r border-border/50 bg-card/30 flex flex-col min-h-0">
          <div className="p-4 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="p-6 text-sm text-muted-foreground text-center">Loading...</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="p-10 text-center">
                <Inbox className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No conversations</p>
              </div>
            )}
            {filtered.map((c) => {
              const meta = CHANNEL_META[c.channel]
              const Icon = meta.icon
              const isActive = c.id === activeId
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`w-full text-left p-4 border-b border-border/30 transition-colors ${
                    isActive ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium text-sm text-foreground">
                        {c.customer_name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${meta.bg} border-2 border-card flex items-center justify-center`}>
                        <Icon className={`w-2.5 h-2.5 ${meta.color}`} />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-medium text-sm text-foreground truncate">{c.customer_name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{timeAgo(c.last_message_at)}</span>
                      </div>
                      <p className={`text-xs truncate ${c.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {c.last_message_preview}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {c.priority === "urgent" && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                            <AlertCircle className="w-2.5 h-2.5" /> Urgent
                          </span>
                        )}
                        {c.priority === "high" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">High</span>
                        )}
                        {c.status === "resolved" && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                            <CheckCheck className="w-2.5 h-2.5" /> Resolved
                          </span>
                        )}
                        {c.status === "pending" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Pending</span>
                        )}
                        {c.unread_count > 0 && (
                          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold min-w-[18px] text-center">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Active thread */}
        <section className="flex flex-col min-h-0 bg-background">
          {!activeConv ? (
            <div className="flex-1 flex items-center justify-center p-10">
              <div className="text-center">
                <Inbox className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a conversation to view</p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="border-b border-border/50 bg-card/40 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium text-sm text-foreground">
                      {activeConv.customer_name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${CHANNEL_META[activeConv.channel].bg} border-2 border-card flex items-center justify-center`}
                    >
                      {(() => {
                        const Icon = CHANNEL_META[activeConv.channel].icon
                        return <Icon className={`w-2.5 h-2.5 ${CHANNEL_META[activeConv.channel].color}`} />
                      })()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{activeConv.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      via {CHANNEL_META[activeConv.channel].label} · {activeConv.customer_external_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeConv.tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      <Tag className="w-2.5 h-2.5" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div ref={threadRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {messages.map((m) => {
                  const isOut = m.direction === "outbound"
                  return (
                    <div key={m.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isOut ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                        <p className={`text-[10px] mt-1 ${isOut ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {m.sender_name} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {messages.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-10">No messages yet</p>
                )}
              </div>

              {/* Reply box */}
              <div className="border-t border-border/50 bg-card/40 p-4">
                <div className="flex items-end gap-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder={`Reply to ${activeConv.customer_name} on ${CHANNEL_META[activeConv.channel].label}...`}
                    rows={2}
                    className="flex-1 resize-none px-4 py-2.5 text-sm bg-background border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!reply.trim() || sending}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Send"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Press Enter to send, Shift+Enter for new line. Replies route through the {CHANNEL_META[activeConv.channel].label} integration.
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
