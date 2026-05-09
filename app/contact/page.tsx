"use client"

import { useState } from "react"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { PageHero } from "@/components/boty/page-hero"
import { Mail, MessageCircle, MapPin, Clock, Loader2, Check, AlertCircle } from "lucide-react"

const subjects = [
  "Order question",
  "Product question",
  "Returns or exchange",
  "Wholesale inquiry",
  "Press",
  "Something else",
]

const channels = [
  {
    icon: Mail,
    title: "Write to us",
    body: "We answer every email, usually within one business day.",
    action: "hello@droat.co",
    href: "mailto:hello@droat.co",
  },
  {
    icon: MessageCircle,
    title: "Live chat",
    body: "Our team is online weekdays — quick replies, real humans.",
    action: "Open chat",
    href: "#",
  },
  {
    icon: MapPin,
    title: "Visit the studio",
    body: "By appointment only — see formulas being made.",
    action: "23 Nimman Road, Chiang Mai",
    href: "#",
  },
]

export default function ContactPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState(subjects[0])
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === "sending") return

    setStatus("sending")
    setErrorMessage("")

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Something went wrong")
      setStatus("success")
      setName("")
      setEmail("")
      setMessage("")
      setSubject(subjects[0])
    } catch (err) {
      setStatus("error")
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <main className="min-h-screen">
      <Header />

      <section className="pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <PageHero
            eyebrow="Contact"
            title="Talk to us, properly"
            description="No bots, no scripts. Just a small team that genuinely cares about getting you the right answer."
          />

          {/* Channels */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {channels.map((c) => (
              <a
                key={c.title}
                href={c.href}
                className="bg-card rounded-3xl p-8 boty-shadow boty-transition hover:scale-[1.02] block"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <c.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <h2 className="font-serif text-2xl text-foreground mb-2">{c.title}</h2>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{c.body}</p>
                <span className="text-sm text-primary font-medium">{c.action}</span>
              </a>
            ))}
          </div>

          {/* Form + Hours */}
          <div className="grid md:grid-cols-3 gap-6">
            <form
              onSubmit={handleSubmit}
              className="md:col-span-2 bg-card rounded-3xl p-8 md:p-10 boty-shadow space-y-5"
            >
              <h2 className="font-serif text-3xl text-foreground mb-2">Send a message</h2>
              <p className="text-muted-foreground mb-6">
                Fill this out and we&apos;ll get back to you the same day, weekdays.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm text-foreground mb-2">
                    Your name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    disabled={status === "sending"}
                    className="w-full px-4 py-3 rounded-2xl bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 boty-transition"
                    placeholder="Mira Oat"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm text-foreground mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={status === "sending"}
                    className="w-full px-4 py-3 rounded-2xl bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 boty-transition"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm text-foreground mb-2">
                  What&apos;s this about?
                </label>
                <select
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={status === "sending"}
                  className="w-full px-4 py-3 rounded-2xl bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 boty-transition"
                >
                  {subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm text-foreground mb-2">
                  Your message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  minLength={10}
                  rows={6}
                  disabled={status === "sending"}
                  className="w-full px-4 py-3 rounded-2xl bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 boty-transition resize-none"
                  placeholder="Tell us a little more..."
                />
              </div>

              {status === "success" && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/10 text-primary">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Message received</p>
                    <p className="text-sm opacity-80">Thanks — we&apos;ll be in touch within one business day.</p>
                  </div>
                </div>
              )}
              {status === "error" && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 text-destructive">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Couldn&apos;t send</p>
                    <p className="text-sm opacity-80">{errorMessage}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full text-sm font-medium boty-transition hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === "sending" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send message"
                )}
              </button>
            </form>

            <div className="bg-primary text-primary-foreground rounded-3xl p-8 boty-shadow space-y-6">
              <div>
                <Clock className="w-5 h-5 mb-3" strokeWidth={1.5} />
                <h3 className="font-serif text-2xl mb-4">When we&apos;re here</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-primary-foreground/80">Mon–Fri</dt>
                    <dd>9am – 6pm ICT</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-primary-foreground/80">Saturday</dt>
                    <dd>10am – 2pm ICT</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-primary-foreground/80">Sunday</dt>
                    <dd>Closed</dd>
                  </div>
                </dl>
              </div>
              <div className="pt-6 border-t border-primary-foreground/20">
                <p className="text-sm text-primary-foreground/80 leading-relaxed">
                  Outside those hours? We still read every email. We&apos;ll reply first thing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
