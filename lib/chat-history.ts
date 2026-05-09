"use client"

import type { UIMessage } from "ai"

export interface ChatSession {
  id: string
  title: string
  messages: UIMessage[]
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = "boty:chat-sessions"
const MAX_SESSIONS = 5
const STORAGE_EVENT = "boty:chat-sessions-changed"

function isBrowser() {
  return typeof window !== "undefined"
}

export function loadSessions(): ChatSession[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatSession[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((s) => s && typeof s.id === "string" && Array.isArray(s.messages))
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .slice(0, MAX_SESSIONS)
  } catch {
    return []
  }
}

function persist(sessions: ChatSession[]) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    // Notify subscribers in the same tab (storage event only fires across tabs)
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT))
  } catch {
    // Quota exceeded or storage disabled — fail silently
  }
}

export function saveSession(session: ChatSession): ChatSession[] {
  if (!isBrowser()) return []
  if (!session.messages || session.messages.length === 0) return loadSessions()

  const all = loadSessions()
  const idx = all.findIndex((s) => s.id === session.id)
  const next: ChatSession[] = idx >= 0 ? [...all] : [session, ...all]
  if (idx >= 0) next[idx] = session

  const trimmed = next
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .slice(0, MAX_SESSIONS)

  persist(trimmed)
  return trimmed
}

export function deleteSession(id: string): ChatSession[] {
  if (!isBrowser()) return []
  const remaining = loadSessions().filter((s) => s.id !== id)
  persist(remaining)
  return remaining
}

export function getMessageText(msg: UIMessage): string {
  return (msg.parts || [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

export function deriveTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user")
  if (!firstUser) return "New chat"
  const text = getMessageText(firstUser).trim().replace(/\s+/g, " ")
  if (!text) return "New chat"
  return text.length > 60 ? text.slice(0, 57) + "..." : text
}

export function newSessionId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Subscribe to session list changes (across tabs and within the same tab).
 * Returns an unsubscribe function.
 */
export function subscribeToSessions(callback: () => void): () => void {
  if (!isBrowser()) return () => {}

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback()
  }
  const onCustom = () => callback()

  window.addEventListener("storage", onStorage)
  window.addEventListener(STORAGE_EVENT, onCustom)

  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(STORAGE_EVENT, onCustom)
  }
}
