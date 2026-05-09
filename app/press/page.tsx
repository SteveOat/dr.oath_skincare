import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { PageHero } from "@/components/boty/page-hero"
import { Download, Mail, ExternalLink } from "lucide-react"

const features = [
  {
    publication: "Vogue",
    quote: "The kind of brand that makes you re-think the word 'natural' — Dr.Oat earns every claim it makes.",
    date: "March 2026",
  },
  {
    publication: "Allure",
    quote: "Their Radiance Serum is the most thoughtful Vitamin C launch of the year.",
    date: "January 2026",
  },
  {
    publication: "The Cut",
    quote: "Quietly luxurious. Genuinely effective. Difficult to put down once you've tried.",
    date: "November 2025",
  },
  {
    publication: "Goop",
    quote: "Editor's pick. Dr.Oat is what clean skincare should have always been.",
    date: "October 2025",
  },
  {
    publication: "Refinery29",
    quote: "Worth every penny — and worth telling your friends about.",
    date: "September 2025",
  },
  {
    publication: "Harper's Bazaar",
    quote: "The cult favorite serum your shelf has been waiting for.",
    date: "August 2025",
  },
]

const assets = [
  { label: "Brand Logo Pack (SVG, PNG)", size: "4.2 MB" },
  { label: "Product Photography (High-res)", size: "82 MB" },
  { label: "Founder Headshots", size: "12 MB" },
  { label: "Brand Style Guide", size: "1.8 MB" },
]

export default function PressPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <section className="pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <PageHero
            eyebrow="Press"
            title="What others are saying"
            description="A small selection of the conversation around Dr.Oat — and everything you need if you're writing your own."
          />

          {/* Features */}
          <div className="grid md:grid-cols-2 gap-6 mb-24">
            {features.map((f) => (
              <article
                key={f.publication}
                className="bg-card rounded-3xl p-8 md:p-10 boty-shadow boty-transition hover:scale-[1.01]"
              >
                <div className="flex items-baseline justify-between mb-6">
                  <h3 className="font-serif text-2xl text-foreground">{f.publication}</h3>
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {f.date}
                  </span>
                </div>
                <blockquote className="text-foreground/90 leading-relaxed text-lg italic font-serif text-pretty">
                  &ldquo;{f.quote}&rdquo;
                </blockquote>
              </article>
            ))}
          </div>

          {/* Press kit */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card rounded-3xl p-8 md:p-10 boty-shadow">
              <h2 className="font-serif text-3xl text-foreground mb-2">Press kit</h2>
              <p className="text-muted-foreground mb-6">
                Logos, photography, fact sheets — everything to write a great story.
              </p>
              <div className="space-y-3">
                {assets.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-background hover:bg-muted/50 boty-transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Download className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm text-foreground text-left">{a.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{a.size}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-primary rounded-3xl p-8 md:p-10 text-primary-foreground boty-shadow flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-primary-foreground/10 flex items-center justify-center mb-6">
                <Mail className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h2 className="font-serif text-3xl mb-3">Press inquiries</h2>
              <p className="text-primary-foreground/80 leading-relaxed mb-6">
                Working on a story? Need a sample, a quote, or a quick fact-check? Our small press team responds within one business day.
              </p>
              <div className="space-y-3 mt-auto">
                <a
                  href="mailto:press@droat.co"
                  className="inline-flex items-center gap-2 text-primary-foreground hover:underline underline-offset-4"
                >
                  press@droat.co
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <p className="text-sm text-primary-foreground/70">
                  Mira Oat, Founder &amp; Head of Press
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
