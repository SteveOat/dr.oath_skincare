import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { PageHero } from "@/components/boty/page-hero"
import { Leaf, Heart, Sparkles, ArrowRight } from "lucide-react"

const values = [
  {
    icon: Leaf,
    title: "Naturally Sourced",
    body: "Every ingredient is selected from organic farms and certified suppliers we visit personally.",
  },
  {
    icon: Heart,
    title: "Skin First",
    body: "Formulas developed alongside dermatologists, with sensitive skin top of mind from day one.",
  },
  {
    icon: Sparkles,
    title: "Quietly Effective",
    body: "We don't chase trends. We refine what works until it earns a place on your shelf.",
  },
]

const milestones = [
  { year: "2018", title: "A Kitchen Table", body: "Dr.Oat begins as small batches mixed in a converted apothecary in Chiang Mai." },
  { year: "2020", title: "First Lab", body: "We open a dedicated formulation lab and bring three dermatologists onto the team." },
  { year: "2022", title: "Going Carbon-Light", body: "Every primary container becomes refillable. Shipping carbon offsets become standard." },
  { year: "2024", title: "Worldwide", body: "Now shipping to 27 countries — still hand-finished, still made in small batches." },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <section className="pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <PageHero
            eyebrow="Our Story"
            title="Skincare that grew out of a garden"
            description="Dr.Oat SkinCare started with one belief: the best things you put on your skin should feel as good as the things you'd put in your body. We've been refining that idea — slowly, deliberately — ever since."
          />

          {/* Story split */}
          <div className="grid md:grid-cols-2 gap-10 lg:gap-16 mb-24 items-center">
            <div className="bg-card rounded-3xl overflow-hidden boty-shadow aspect-[4/5] relative">
              <Image
                src="/images/products/serum-bottles-1.png"
                alt="Dr.Oat botanical serums"
                fill
                className="object-cover"
              />
            </div>
            <div className="space-y-6">
              <h2 className="font-serif text-3xl md:text-4xl text-foreground text-balance">
                Founded by Dr. Mira Oat in 2018
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                After fifteen years as a clinical dermatologist, Dr. Mira grew frustrated with the gap between what science said skin needed and what shelves were actually selling. So she started mixing her own — first for patients, then for friends, then for anyone who asked.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Today, Dr.Oat is still small enough that every formula crosses her desk, and big enough to source the rarest oat extracts, hyaluronic complexes, and cold-pressed botanicals on the planet. Nothing leaves our lab unless it would earn a place in her own routine.
              </p>
            </div>
          </div>

          {/* Values */}
          <div className="mb-24">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-12 text-center text-balance">
              What we stand for
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="bg-card rounded-3xl p-8 boty-shadow boty-transition hover:scale-[1.02]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    <value.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-2xl text-foreground mb-3">{value.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{value.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="mb-24">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-12 text-center text-balance">
              Slow growth, strong roots
            </h2>
            <div className="max-w-3xl mx-auto space-y-4">
              {milestones.map((m, i) => (
                <div
                  key={m.year}
                  className="flex gap-6 md:gap-10 bg-card rounded-3xl p-6 md:p-8 boty-shadow"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="font-serif text-3xl md:text-4xl text-primary leading-none w-20 md:w-24 flex-shrink-0">
                    {m.year}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-1">{m.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{m.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-primary rounded-3xl p-10 md:p-16 text-center boty-shadow">
            <h2 className="font-serif text-3xl md:text-4xl text-primary-foreground mb-4 text-balance">
              Find your routine
            </h2>
            <p className="text-primary-foreground/80 max-w-md mx-auto mb-8">
              Browse the full collection — every product hand-finished, naturally derived, dermatologist-formulated.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-8 py-4 bg-background text-foreground rounded-full text-sm font-medium boty-transition hover:scale-105"
            >
              Shop the collection
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
