import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { PageHero } from "@/components/boty/page-hero"
import { Truck, Globe, Clock, Package, AlertCircle } from "lucide-react"

const zones = [
  {
    region: "Thailand",
    standard: "2–4 business days",
    express: "1–2 business days",
    free: "Free over ฿1,500",
  },
  {
    region: "Southeast Asia",
    standard: "5–8 business days",
    express: "3–5 business days",
    free: "Free over $80",
  },
  {
    region: "Asia Pacific",
    standard: "7–10 business days",
    express: "4–6 business days",
    free: "Free over $120",
  },
  {
    region: "North America",
    standard: "10–14 business days",
    express: "5–7 business days",
    free: "Free over $150",
  },
  {
    region: "Europe & UK",
    standard: "10–14 business days",
    express: "5–7 business days",
    free: "Free over €140",
  },
  {
    region: "Rest of world",
    standard: "12–18 business days",
    express: "Not available",
    free: "Calculated at checkout",
  },
]

export default function ShippingPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <section className="pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <PageHero
            eyebrow="Shipping"
            title="Where we ship, how fast, what it costs"
            description="Carbon-offset shipping to 27 countries. Plastic-free packaging, real tracking, and a team you can email if anything goes sideways."
          />

          {/* Highlights */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: Truck,
                title: "Free over your threshold",
                body: "We cover standard shipping when you cross your region&apos;s free-shipping line.",
              },
              {
                icon: Globe,
                title: "27 countries",
                body: "We add new destinations every quarter. Email us if yours isn't listed.",
              },
              {
                icon: Package,
                title: "100% plastic-free",
                body: "Mushroom-foam padding, recycled paper, water-activated tape. Compost the box.",
              },
            ].map((h) => (
              <div key={h.title} className="bg-card rounded-3xl p-8 boty-shadow">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <h.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <h2 className="font-serif text-2xl text-foreground mb-2">{h.title}</h2>
                <p className="text-muted-foreground leading-relaxed text-sm">{h.body}</p>
              </div>
            ))}
          </div>

          {/* Rate table */}
          <div className="bg-card rounded-3xl p-2 md:p-3 boty-shadow mb-16 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-5 text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Region</th>
                    <th className="text-left p-5 text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Standard</th>
                    <th className="text-left p-5 text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Express</th>
                    <th className="text-left p-5 text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Free shipping</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((z, i) => (
                    <tr
                      key={z.region}
                      className={i !== zones.length - 1 ? "border-b border-border/30" : ""}
                    >
                      <td className="p-5 font-medium text-foreground">{z.region}</td>
                      <td className="p-5 text-muted-foreground text-sm">{z.standard}</td>
                      <td className="p-5 text-muted-foreground text-sm">{z.express}</td>
                      <td className="p-5 text-muted-foreground text-sm">{z.free}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card rounded-3xl p-8 boty-shadow">
              <Clock className="w-5 h-5 text-primary mb-4" strokeWidth={1.5} />
              <h2 className="font-serif text-2xl text-foreground mb-3">Processing time</h2>
              <p className="text-muted-foreground leading-relaxed text-sm mb-3">
                Orders placed before 2pm ICT on weekdays ship the same day. Orders after that, or on weekends, ship the next business day.
              </p>
              <p className="text-muted-foreground leading-relaxed text-sm">
                During launches and seasonal sales, processing may take an extra day. We&apos;ll always email if anything is delayed.
              </p>
            </div>
            <div className="bg-card rounded-3xl p-8 boty-shadow">
              <AlertCircle className="w-5 h-5 text-primary mb-4" strokeWidth={1.5} />
              <h2 className="font-serif text-2xl text-foreground mb-3">Customs &amp; duties</h2>
              <p className="text-muted-foreground leading-relaxed text-sm mb-3">
                For most destinations, duties and taxes are calculated at checkout — so what you pay is what you pay. For a small number of countries, the courier may collect on delivery.
              </p>
              <p className="text-muted-foreground leading-relaxed text-sm">
                If duties surprise you on arrival, write to us and we&apos;ll work it out together.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
