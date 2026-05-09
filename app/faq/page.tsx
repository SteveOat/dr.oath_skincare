"use client"

import { useState } from "react"
import Link from "next/link"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { PageHero } from "@/components/boty/page-hero"
import { ChevronDown, MessageCircle } from "lucide-react"

type Category = {
  title: string
  items: { q: string; a: string }[]
}

const faq: Category[] = [
  {
    title: "Orders & shipping",
    items: [
      {
        q: "How fast do you ship?",
        a: "Standard orders ship within 24 hours on weekdays. Domestic delivery is 2–4 business days; international is 7–14 days depending on customs. Tracking is sent automatically once your order is on its way.",
      },
      {
        q: "Do you ship internationally?",
        a: "Yes, we ship to 27 countries. Duties and taxes are calculated at checkout where possible — what you see is what you pay. If your country isn't listed, write to us; we add new destinations every quarter.",
      },
      {
        q: "Can I change my address after ordering?",
        a: "If we haven't shipped yet — yes, just email us with your order number. Once it's with the courier, we can no longer redirect, but most carriers let you update delivery instructions on their app.",
      },
    ],
  },
  {
    title: "Products & ingredients",
    items: [
      {
        q: "Are your products vegan?",
        a: "Every product is vegan and cruelty-free. We don't test on animals, our suppliers don't test on animals, and we don't use any animal-derived ingredients.",
      },
      {
        q: "Do they suit sensitive skin?",
        a: "Yes — sensitive skin is what we formulated for. Every product is patch-tested under dermatologist supervision and is fragrance-free unless explicitly noted. If you have a known allergy, the full INCI list is on every product page.",
      },
      {
        q: "What's the shelf life?",
        a: "Unopened products are good for 24 months. Once opened, the PAO (period-after-opening) symbol on the packaging tells you how long the formula stays at peak — typically 6–12 months depending on the active.",
      },
      {
        q: "Are they pregnancy-safe?",
        a: "Most are, but some (notably the Age Defense Serum and Night Cream which contain retinol) should be avoided during pregnancy and breastfeeding. Each product page lists pregnancy guidance — when in doubt, please ask your doctor.",
      },
    ],
  },
  {
    title: "Returns & refunds",
    items: [
      {
        q: "What if I don't like it?",
        a: "We offer a 30-day satisfaction promise. Try it. If it's not for you, write to us and we'll arrange a refund or exchange — no need to return half-empty products.",
      },
      {
        q: "How do refunds work?",
        a: "Refunds go back to the original payment method within 5–7 business days of approval. You'll get an email confirming each step.",
      },
    ],
  },
  {
    title: "Account & subscriptions",
    items: [
      {
        q: "Do I need an account to order?",
        a: "Nope. You can check out as a guest. An account is just convenient — order history, faster checkout, and the option to save addresses.",
      },
      {
        q: "Can I subscribe & save?",
        a: "Yes — every refillable product can be subscribed to. Save 15%, choose your cadence, skip or pause anytime. No commitments, no locked terms.",
      },
    ],
  },
]

export default function FAQPage() {
  const [open, setOpen] = useState<string | null>("0-0")

  return (
    <main className="min-h-screen">
      <Header />

      <section className="pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <PageHero
            eyebrow="FAQ"
            title="Questions, answered"
            description="The things we get asked most often. Can't find yours? Write to us — a real person will reply."
          />

          <div className="grid md:grid-cols-3 gap-10 lg:gap-16">
            <aside className="md:col-span-1">
              <div className="md:sticky md:top-28 space-y-2">
                {faq.map((cat, i) => (
                  <a
                    key={cat.title}
                    href={`#cat-${i}`}
                    className="block py-3 px-4 rounded-2xl hover:bg-card boty-transition text-foreground/80 hover:text-foreground"
                  >
                    {cat.title}
                  </a>
                ))}
              </div>
            </aside>

            <div className="md:col-span-2 space-y-12">
              {faq.map((cat, i) => (
                <div key={cat.title} id={`cat-${i}`} className="scroll-mt-28">
                  <h2 className="font-serif text-3xl text-foreground mb-6">{cat.title}</h2>
                  <div className="space-y-3">
                    {cat.items.map((item, j) => {
                      const id = `${i}-${j}`
                      const isOpen = open === id
                      return (
                        <div
                          key={id}
                          className="bg-card rounded-3xl boty-shadow overflow-hidden boty-transition"
                        >
                          <button
                            type="button"
                            onClick={() => setOpen(isOpen ? null : id)}
                            className="w-full flex items-center justify-between gap-4 p-6 text-left"
                            aria-expanded={isOpen}
                          >
                            <span className="font-medium text-foreground">{item.q}</span>
                            <ChevronDown
                              className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          <div
                            className={`grid transition-all duration-300 ease-out ${
                              isOpen
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0"
                            }`}
                          >
                            <div className="overflow-hidden">
                              <p className="px-6 pb-6 text-muted-foreground leading-relaxed">
                                {item.a}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div className="bg-primary text-primary-foreground rounded-3xl p-8 md:p-10 boty-shadow flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-foreground/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-2xl mb-2">Still stuck?</h2>
                  <p className="text-primary-foreground/80 mb-4 leading-relaxed">
                    The team is one short message away.
                  </p>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-background text-foreground rounded-full text-sm font-medium boty-transition hover:scale-[1.02]"
                  >
                    Contact us
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
