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
  ChevronDown,
  Plus,
  X,
  Flag,
  Circle,
  CheckCircle2,
  Archive,
  Clock,
  Sparkles,
  Loader2,
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

type Status = Conversation["status"]
type Priority = Conversation["priority"]

const STATUS_META: Record<Status, { label: string; icon: any; className: string }> = {
  open: { label: "Open", icon: Circle, className: "bg-blue-100 text-blue-700 border-blue-200" },
  pending: { label: "Pending", icon: Clock, className: "bg-amber-100 text-amber-700 border-amber-200" },
  resolved: { label: "Resolved", icon: CheckCircle2, className: "bg-green-100 text-green-700 border-green-200" },
  archived: { label: "Archived", icon: Archive, className: "bg-slate-200 text-slate-600 border-slate-300" },
}

const PRIORITY_META: Record<Priority, { label: string; className: string; dot: string }> = {
  low: { label: "Low", className: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  normal: { label: "Normal", className: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  high: { label: "High", className: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  urgent: { label: "Urgent", className: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
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
  const [deliveryStatus, setDeliveryStatus] = useState<{
    status: "delivered" | "failed" | "simulated"
    error?: string
  } | null>(null)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false)
  const [tagInputOpen, setTagInputOpen] = useState(false)
  const [newTagValue, setNewTagValue] = useState("")
  const [suggestions, setSuggestions] = useState<
    { tone: string; label: string; text: string }[] | null
  >(null)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const headerControlsRef = useRef<HTMLDivElement>(null)

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (headerControlsRef.current && !headerControlsRef.current.contains(e.target as Node)) {
        setStatusMenuOpen(false)
        setPriorityMenuOpen(false)
        setTagInputOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Reset menus and suggestions when switching conversations
  useEffect(() => {
    setStatusMenuOpen(false)
    setPriorityMenuOpen(false)
    setTagInputOpen(false)
    setNewTagValue("")
    setSuggestions(null)
    setSuggestionsError(null)
  }, [activeId])

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

  // Optimistically update conversation status / priority / tags
  async function updateConversation(
    id: string,
    updates: Partial<Pick<Conversation, "status" | "priority" | "tags">>,
  ) {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    )
    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok && !id.startsWith("mock-")) {
        console.error("[v0] update conversation failed:", await res.text())
        // Reload to revert if the server rejected the change
        loadConversations()
      }
    } catch (err) {
      console.error("[v0] update conversation error:", err)
      if (!id.startsWith("mock-")) loadConversations()
    }
  }

  function handleStatusChange(status: Status) {
    if (!activeId) return
    updateConversation(activeId, { status })
    setStatusMenuOpen(false)
  }

  function handlePriorityChange(priority: Priority) {
    if (!activeId) return
    updateConversation(activeId, { priority })
    setPriorityMenuOpen(false)
  }

  function handleAddTag() {
    const tag = newTagValue.trim()
    if (!tag || !activeId) return
    const conv = conversations.find((c) => c.id === activeId)
    if (!conv) return
    if (conv.tags.includes(tag)) {
      setNewTagValue("")
      setTagInputOpen(false)
      return
    }
    updateConversation(activeId, { tags: [...conv.tags, tag] })
    setNewTagValue("")
    setTagInputOpen(false)
  }

  function handleRemoveTag(tag: string) {
    if (!activeId) return
    const conv = conversations.find((c) => c.id === activeId)
    if (!conv) return
    updateConversation(activeId, { tags: conv.tags.filter((t) => t !== tag) })
  }

  // Fetch AI-generated reply suggestions for the active conversation
  async function fetchSuggestions() {
    if (!activeId) return
    const conv = conversations.find((c) => c.id === activeId)
    if (!conv) return

    setSuggestionsLoading(true)
    setSuggestionsError(null)
    setSuggestions(null)

    try {
      const res = await fetch(`/api/messages/${activeId}/suggest-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Forward context so mock conversations also get useful suggestions
        body: JSON.stringify({
          conversation: conv,
          messages: messages,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate suggestions")
      }
      setSuggestions(data.suggestions || [])
    } catch (err) {
      console.error("[v0] suggest-reply failed:", err)
      setSuggestionsError(err instanceof Error ? err.message : "Failed to load suggestions")
    } finally {
      setSuggestionsLoading(false)
    }
  }

  function applySuggestion(text: string) {
    setReply(text)
    // Keep the suggestions panel open so the agent can still pick another one,
    // but clear any error.
    setSuggestionsError(null)
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
      const res = await fetch(`/api/messages/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      })
      const data = await res.json().catch(() => ({}))
      if (data?.delivery) {
        setDeliveryStatus({
          status: data.delivery.status,
          error: data.delivery.error,
        })
        // Auto-clear after 4 seconds
        setTimeout(() => setDeliveryStatus(null), 4000)
      }
    } catch (err) {
      console.error("[v0] send failed:", err)
      setDeliveryStatus({ status: "failed", error: "Network error" })
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
              <div className="border-b border-border/50 bg-card/40 px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
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
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{activeConv.customer_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        via {CHANNEL_META[activeConv.channel].label} · {activeConv.customer_external_id}
                      </p>
                    </div>
                  </div>

                  {/* Status / Priority / Resolve controls */}
                  <div ref={headerControlsRef} className="flex items-center gap-2 shrink-0">
                    {/* Priority dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setPriorityMenuOpen((v) => !v)
                          setStatusMenuOpen(false)
                          setTagInputOpen(false)
                        }}
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors hover:opacity-90 ${PRIORITY_META[activeConv.priority].className}`}
                        aria-haspopup="listbox"
                        aria-expanded={priorityMenuOpen}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_META[activeConv.priority].dot}`} />
                        <Flag className="w-3 h-3" />
                        <span className="font-medium">{PRIORITY_META[activeConv.priority].label}</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {priorityMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                          {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => handlePriorityChange(p)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted/60 transition-colors ${
                                activeConv.priority === p ? "bg-muted/40" : ""
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_META[p].dot}`} />
                              <span className="text-foreground">{PRIORITY_META[p].label}</span>
                              {activeConv.priority === p && (
                                <CheckCheck className="w-3 h-3 ml-auto text-primary" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Status dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setStatusMenuOpen((v) => !v)
                          setPriorityMenuOpen(false)
                          setTagInputOpen(false)
                        }}
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors hover:opacity-90 ${STATUS_META[activeConv.status].className}`}
                        aria-haspopup="listbox"
                        aria-expanded={statusMenuOpen}
                      >
                        {(() => {
                          const Icon = STATUS_META[activeConv.status].icon
                          return <Icon className="w-3 h-3" />
                        })()}
                        <span className="font-medium">{STATUS_META[activeConv.status].label}</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {statusMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                          {(Object.keys(STATUS_META) as Status[]).map((s) => {
                            const Icon = STATUS_META[s].icon
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => handleStatusChange(s)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted/60 transition-colors ${
                                  activeConv.status === s ? "bg-muted/40" : ""
                                }`}
                              >
                                <Icon className="w-3 h-3 text-muted-foreground" />
                                <span className="text-foreground">{STATUS_META[s].label}</span>
                                {activeConv.status === s && (
                                  <CheckCheck className="w-3 h-3 ml-auto text-primary" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Mark resolved quick action (hidden when already resolved) */}
                    {activeConv.status !== "resolved" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange("resolved")}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Resolve</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Tags row */}
                <div className="mt-3 flex items-center flex-wrap gap-1.5">
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  {activeConv.tags.length === 0 && !tagInputOpen && (
                    <span className="text-[11px] text-muted-foreground italic">No tags</span>
                  )}
                  {activeConv.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-foreground border border-border/60 group"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="opacity-60 hover:opacity-100 hover:text-red-600 transition-opacity"
                        aria-label={`Remove tag ${t}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {tagInputOpen ? (
                    <div className="inline-flex items-center gap-1">
                      <input
                        autoFocus
                        type="text"
                        value={newTagValue}
                        onChange={(e) => setNewTagValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleAddTag()
                          } else if (e.key === "Escape") {
                            setTagInputOpen(false)
                            setNewTagValue("")
                          }
                        }}
                        placeholder="Add tag..."
                        maxLength={32}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 w-28"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="text-[11px] text-primary font-medium hover:underline"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTagInputOpen(true)
                        setStatusMenuOpen(false)
                        setPriorityMenuOpen(false)
                      }}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Tag
                    </button>
                  )}
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
                {deliveryStatus && (
                  <div
                    className={`mb-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
                      deliveryStatus.status === "delivered"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : deliveryStatus.status === "simulated"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    <span className="font-medium capitalize">{deliveryStatus.status}</span>
                    {deliveryStatus.status === "delivered" && (
                      <span>
                        — sent to {CHANNEL_META[activeConv.channel].label}
                      </span>
                    )}
                    {deliveryStatus.status === "simulated" && (
                      <span>— saved locally (channel API not configured)</span>
                    )}
                    {deliveryStatus.status === "failed" && deliveryStatus.error && (
                      <span>— {deliveryStatus.error}</span>
                    )}
                  </div>
                )}

                {/* AI suggested replies */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={fetchSuggestions}
                      disabled={suggestionsLoading || messages.length === 0}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {suggestionsLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      {suggestions ? "Regenerate suggestions" : "Suggest replies"}
                    </button>
                    {suggestions && (
                      <button
                        type="button"
                        onClick={() => setSuggestions(null)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Hide
                      </button>
                    )}
                  </div>

                  {suggestionsError && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {suggestionsError}
                    </div>
                  )}

                  {suggestions && suggestions.length > 0 && (
                    <div className="space-y-2">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => applySuggestion(s.text)}
                          className="w-full text-left bg-card border border-border/60 hover:border-primary/40 hover:bg-primary/5 rounded-lg p-3 transition-all group"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] uppercase tracking-wide font-semibold text-primary">
                              {s.tone}
                            </span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[10px] text-muted-foreground">{s.label}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              Click to use
                            </span>
                          </div>
                          <p className="text-xs text-foreground leading-relaxed line-clamp-3">
                            {s.text}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

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
