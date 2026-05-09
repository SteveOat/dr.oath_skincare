import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { PageHero } from "@/components/boty/page-hero"
import { Check, X } from "lucide-react"

const ingredients = [
  {
    name: "Colloidal Oats",
    role: "Soothing & Barrier Repair",
    body: "Our namesake. Finely milled oats that calm reactive skin, lock moisture in, and reinforce a compromised barrier in days.",
    sourcedFrom: "Northern Thailand",
    foundIn: ["Hydra Cream", "Gentle Cleanser", "Glow Mask"],
  },
  {
    name: "Hyaluronic Complex (5 weights)",
    role: "Multi-depth Hydration",
    body: "A blend of five molecular weights that draw water into every layer of skin — surface plumping you feel within minutes, deep hydration you keep for hours.",
    sourcedFrom: "Bio-fermented in Switzerland",
    foundIn: ["Hydrating Serum", "Hydra Cream", "Day Cream SPF 30"],
  },
  {
    name: "Vitamin C (Ethyl Ascorbic Acid)",
    role: "Brightening & Antioxidant",
    body: "A stable, oil-soluble form of vitamin C that survives sunlight and time. Brightens uneven tone, fades pigmentation, neutralizes pollution damage.",
    sourcedFrom: "Lab-synthesized, GMP-certified",
    foundIn: ["Radiance Serum", "Glow Serum"],
  },
  {
    name: "Encapsulated Retinol",
    role: "Renewal & Smoothing",
    body: "Retinol wrapped in a slow-release liposome that delivers active dose to skin without the irritation. Stimulates collagen, refines texture, evens tone overnight.",
    sourcedFrom: "Cold-chain shipped from France",
    foundIn: ["Age Defense Serum", "Night Cream"],
  },
  {
    name: "Niacinamide",
    role: "Pore & Sebum Balance",
    body: "5% concentration to reduce visible pore size, control oil, and even skin tone — gentle enough for daily use, smart enough for layering.",
    sourcedFrom: "Pharmaceutical grade, Korea",
    foundIn: ["Glow Serum", "Balance Toner"],
  },
  {
    name: "Cold-pressed Rosehip",
    role: "Natural Vitamin A & Repair",
    body: "Rosehips harvested by hand and pressed within 48 hours. Rich in trans-retinoic acid for natural cell turnover and scar fading.",
    sourcedFrom: "Patagonian highlands",
    foundIn: ["Renewal Oil", "Rosehip Oil"],
  },
  {
    name: "Moroccan Argan",
    role: "Lipid Restoration",
    body: "First-press argan from a women's cooperative in Essaouira. Restores skin lipids, softens dehydration lines, calms sensitivity.",
    sourcedFrom: "Cooperative-sourced, Morocco",
    foundIn: ["Argan Oil", "Night Cream"],
  },
  {
    name: "Centella Asiatica",
    role: "Calming & Healing",
    body: "Triple-extracted (asiaticoside, madecassoside, asiatic acid) for the strongest soothing power available. Reduces redness, accelerates healing, supports barrier.",
    sourcedFrom: "Highland farms, Vietnam",
    foundIn: ["Gentle Cleanser", "Glow Mask", "Hydra Cream"],
  },
]

const neverList = [
  "Parabens",
  "Sulfates (SLS / SLES)",
  "Synthetic fragrance",
  "Mineral oil",
  "Phthalates",
  "Animal testing",
  "PEGs",
  "Silicones (occlusive)",
  "Drying alcohols",
  "Formaldehyde releasers",
]

export default function IngredientsPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <section className="pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <PageHero
            eyebrow="Ingredients"
            title="Every drop, traceable"
            description="We list every active. We name every supplier. If we wouldn't put it on our own skin, it doesn't make the formula. Here's exactly what's in your bottle — and why it's there."
          />

          {/* Ingredient cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-20">
            {ingredients.map((ing) => (
              <article
                key={ing.name}
                className="bg-card rounded-3xl p-8 boty-shadow boty-transition hover:scale-[1.01]"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-serif text-2xl text-foreground mb-1">{ing.name}</h2>
                    <p className="text-xs tracking-[0.2em] uppercase text-primary">{ing.role}</p>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-5">{ing.body}</p>
                <div className="pt-5 border-t border-border/50 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Sourced from</span>
                    <span className="text-foreground text-right">{ing.sourcedFrom}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground flex-shrink-0">Found in</span>
                    <span className="text-foreground text-right">{ing.foundIn.join(", ")}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Promises */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-primary text-primary-foreground rounded-3xl p-8 md:p-10 boty-shadow">
              <h2 className="font-serif text-3xl mb-6">What we always include</h2>
              <ul className="space-y-3">
                {[
                  "Plant-derived actives wherever possible",
                  "Clinical-grade preservation, food-safe",
                  "Full INCI list on every package",
                  "Batch traceability from farm to bottle",
                  "Independent third-party stability testing",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-primary-foreground/90">
                    <Check className="w-4 h-4 mt-1 flex-shrink-0" />
                    <span className="text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card rounded-3xl p-8 md:p-10 boty-shadow">
              <h2 className="font-serif text-3xl text-foreground mb-6">What we never use</h2>
              <ul className="grid grid-cols-2 gap-3">
                {neverList.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-muted-foreground">
                    <X className="w-4 h-4 mt-0.5 flex-shrink-0 text-destructive" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
