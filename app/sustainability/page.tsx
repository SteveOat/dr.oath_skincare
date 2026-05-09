import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { PageHero } from "@/components/boty/page-hero"
import { Recycle, Leaf, TreePine, Globe, PackageCheck, Droplets } from "lucide-react"

const stats = [
  { value: "92%", label: "of packaging is refillable or compostable" },
  { value: "100%", label: "of shipping carbon offset since 2020" },
  { value: "0", label: "single-use plastics in our supply chain" },
  { value: "1.4M", label: "trees planted via 1% for the Planet partners" },
]

const pillars = [
  {
    icon: Recycle,
    title: "Refill, don't replace",
    body: "Glass primary containers refill at home with paper-pulp pods. One bottle, used hundreds of times — the way it should have always been.",
  },
  {
    icon: Leaf,
    title: "Botanically grown",
    body: "Our growers use regenerative practices that pull more carbon from soil than they emit. Every harvest leaves the land healthier than the last.",
  },
  {
    icon: TreePine,
    title: "1% for the Planet",
    body: "We give 1% of every sale to vetted reforestation and clean-water projects. You shop, the planet quietly gets a little better.",
  },
  {
    icon: Globe,
    title: "Local before global",
    body: "Three regional fulfillment hubs reduce average shipping distance by 71%. The fewer miles, the smaller the footprint.",
  },
  {
    icon: PackageCheck,
    title: "Zero-plastic shipping",
    body: "Mushroom-foam padding, recycled-paper void fill, water-activated tape. Drop the whole box in your compost.",
  },
  {
    icon: Droplets,
    title: "Water-wise formulas",
    body: "Concentrated formulas mean smaller bottles, less water shipped, less energy used. A bottle of our serum has 40% less water than industry average.",
  },
]

export default function SustainabilityPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <section className="pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <PageHero
            eyebrow="Sustainability"
            title="Beauty shouldn't cost the earth"
            description="We grew up loving nature. We're not interested in skincare that takes more from it than it gives. Here's how we work — and where we're still working harder."
          />

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-24">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bg-card rounded-3xl p-8 boty-shadow text-center"
              >
                <div className="font-serif text-4xl md:text-5xl text-primary mb-3">{s.value}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Pillars */}
          <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-12 text-center text-balance">
            Six commitments we live by
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="bg-card rounded-3xl p-8 boty-shadow boty-transition hover:scale-[1.02]"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <p.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="font-serif text-2xl text-foreground mb-3">{p.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>

          {/* Honest section */}
          <div className="bg-primary rounded-3xl p-10 md:p-16 text-primary-foreground">
            <h2 className="font-serif text-3xl md:text-4xl mb-6 text-balance">
              Where we're still working
            </h2>
            <p className="text-primary-foreground/90 leading-relaxed mb-6 max-w-2xl">
              We don't pretend to be perfect. Two areas we're actively improving in 2026: closing our last 8% of non-refillable SKUs (target: Q3), and shifting the Argan and Rosehip supply chains to regenerative-only suppliers (target: end of year).
            </p>
            <p className="text-primary-foreground/80 text-sm leading-relaxed max-w-2xl">
              Read our annual impact report or write to{" "}
              <a href="mailto:earth@droat.co" className="underline underline-offset-4">
                earth@droat.co
              </a>{" "}
              — we read every email and we welcome the hard questions.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
