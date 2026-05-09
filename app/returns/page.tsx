import Link from "next/link"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { PageHero } from "@/components/boty/page-hero"
import { Heart, RefreshCw, Mail, ArrowRight } from "lucide-react"

const steps = [
  {
    number: "01",
    title: "Email the team",
    body: "Write to returns@droat.co with your order number and a quick note on what didn't work for you. We read every message — it helps us improve.",
  },
  {
    number: "02",
    title: "We respond same day",
    body: "On weekdays we reply within hours. We'll confirm a refund or send a replacement — your choice — and email you the next steps.",
  },
  {
    number: "03",
    title: "Refund in 5–7 days",
    body: "Once approved, your refund goes back to your original payment method within 5–7 business days. Replacements ship next-day.",
  },
]

export default function ReturnsPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <section className="pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <PageHero
            eyebrow="Returns"
            title="The 30-day satisfaction promise"
            description="Skincare is personal. Sometimes a formula isn't right for you, and that's okay. Our promise is simple: try it, and if it isn't working, tell us — no fuss, no fine print."
          />

          {/* Promise card */}
          <div className="bg-primary text-primary-foreground rounded-3xl p-10 md:p-16 mb-16 boty-shadow text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary-foreground/10 flex items-center justify-center mx-auto mb-6">
              <Heart className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <h2 className="font-serif text-3xl md:text-4xl mb-4 text-balance">
              30 days. No half-empty bottles to ship back.
            </h2>
            <p className="text-primary-foreground/80 max-w-xl mx-auto leading-relaxed">
              You don&apos;t need to send products back to qualify for a refund. Just tell us your story, and we&apos;ll make it right. We&apos;d rather you keep the bottle and pass it to a friend who&apos;s skin might love it more.
            </p>
          </div>

          {/* Steps */}
          <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-12 text-center text-balance">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {steps.map((s) => (
              <div key={s.number} className="bg-card rounded-3xl p-8 boty-shadow">
                <div className="font-serif text-5xl text-primary/30 mb-4 leading-none">
                  {s.number}
                </div>
                <h3 className="font-serif text-2xl text-foreground mb-3">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{s.body}</p>
              </div>
            ))}
          </div>

          {/* Two columns: exchanges + faq */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="bg-card rounded-3xl p-8 boty-shadow">
              <RefreshCw className="w-5 h-5 text-primary mb-4" strokeWidth={1.5} />
              <h2 className="font-serif text-2xl text-foreground mb-3">Exchanges</h2>
              <p className="text-muted-foreground leading-relaxed text-sm mb-3">
                Want to swap one product for another? We do free exchanges within the same 30-day window. Email us your order number and the new product you&apos;d like — we&apos;ll handle the rest.
              </p>
              <p className="text-muted-foreground leading-relaxed text-sm">
                If the new product is more expensive, we&apos;ll send a small invoice for the difference. If it&apos;s less, we refund the difference.
              </p>
            </div>

            <div className="bg-card rounded-3xl p-8 boty-shadow">
              <Mail className="w-5 h-5 text-primary mb-4" strokeWidth={1.5} />
              <h2 className="font-serif text-2xl text-foreground mb-3">Damaged in transit?</h2>
              <p className="text-muted-foreground leading-relaxed text-sm mb-3">
                Send a quick photo to{" "}
                <a href="mailto:returns@droat.co" className="text-primary underline underline-offset-4">
                  returns@droat.co
                </a>{" "}
                within 7 days of delivery. We&apos;ll ship a replacement immediately, on us.
              </p>
              <p className="text-muted-foreground leading-relaxed text-sm">
                You don&apos;t need to return the damaged item — please dispose of it responsibly (the contents are skin-safe to compost).
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-card rounded-3xl p-10 md:p-16 boty-shadow text-center">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-4 text-balance">
              Ready to start a return?
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              The fastest way is a quick email or message — we reply within hours on weekdays.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full text-sm font-medium boty-transition hover:scale-[1.02]"
            >
              Contact us
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
