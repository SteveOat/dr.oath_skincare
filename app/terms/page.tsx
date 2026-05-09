import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { PageHero } from "@/components/boty/page-hero"

const sections = [
  {
    heading: "Welcome",
    body: [
      "These are the terms that apply when you use droat.co or buy something from us. By browsing or placing an order, you agree to them. If anything's unclear, write to us — we'd rather explain than have you guess.",
    ],
  },
  {
    heading: "Who we are",
    body: [
      "Dr.Oat SkinCare Co., Ltd. — a company registered in Thailand. Address and registration number are in our footer for any company that needs them for invoicing.",
    ],
  },
  {
    heading: "Placing orders",
    body: [
      "When you check out, you make us an offer. We accept that offer when we send the shipping confirmation email — that's when the contract begins. Until then, we may decline an order (extremely rare, but reasons might include stock issues, address verification problems, or suspected fraud).",
      "All prices are in the currency shown at checkout, inclusive of VAT where applicable.",
      "We do our best to keep product information accurate, but typos and errors happen. If something is mispriced, we'll always honour the lower price unless the error is obvious — in which case we'll let you know and either refund or ship at the correct price with your approval.",
    ],
  },
  {
    heading: "Payment",
    body: [
      "We accept major credit and debit cards, plus regional methods (PromptPay, Apple Pay, Google Pay) where available. Payments are processed by Stripe; we never see your full card number.",
      "If a payment fails, your order pauses until it succeeds. We'll email you to let you know.",
    ],
  },
  {
    heading: "Shipping & delivery",
    body: [
      "We aim to ship within one business day. Estimated delivery times are on our shipping page. Once the parcel leaves us, the carrier becomes responsible — but if anything goes wrong, write to us and we'll help fix it.",
      "Risk of loss passes to you when we hand the parcel to the carrier. Title passes when payment clears.",
    ],
  },
  {
    heading: "Returns & the satisfaction promise",
    body: [
      "We offer a 30-day satisfaction promise — full details on our returns page. The short version: try it, and if it isn't right for you, write to us within 30 days of delivery and we'll refund or replace.",
      "Some items aren't returnable for hygiene reasons (e.g. opened sample sets). We'll always tell you on the product page if that applies.",
    ],
  },
  {
    heading: "Using the site",
    body: [
      "You agree not to misuse the site — no scraping for commercial use, no automated abuse, no attempts to compromise security, no posting of unlawful content.",
      "All site content (text, photography, formulas, illustrations) is owned by Dr.Oat SkinCare or licensed to us. You can share, link, and reference us — please don't copy whole pages or repackage our photography.",
    ],
  },
  {
    heading: "Accounts",
    body: [
      "Optional. If you create one, you're responsible for keeping your password secure. Tell us immediately if you suspect unauthorized access — write to security@droat.co.",
      "We may suspend or close accounts that breach these terms or that are inactive for an extended period.",
    ],
  },
  {
    heading: "Liability",
    body: [
      "Our products are cosmetic, not medical. They aren't a substitute for medical advice. If you have a skin condition, please consult a dermatologist before using new products.",
      "To the maximum extent allowed by law, our total liability for any claim is capped at the amount you paid for the product. We're not liable for indirect or consequential losses.",
      "Nothing in these terms limits liability that can't be limited under applicable consumer law.",
    ],
  },
  {
    heading: "Changes to these terms",
    body: [
      "We may update these terms from time to time. The updated terms apply from the date they're posted. If you have an active subscription, we'll email you about material changes before they take effect.",
    ],
  },
  {
    heading: "Governing law",
    body: [
      "These terms are governed by the laws of Thailand. Any dispute will be resolved in the courts of Bangkok unless your local law gives you the right to bring a claim closer to home — in which case, you have that right.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "Questions about these terms? Write to legal@droat.co. We reply within five business days.",
    ],
  },
]

export default function TermsPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <section className="pt-28 pb-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <PageHero
            eyebrow="Terms"
            title="Terms of Service"
            description="Plain-language terms for buying from and using droat.co. Last updated 5 November 2025."
          />

          <div className="space-y-6">
            {sections.map((s) => (
              <article
                key={s.heading}
                className="bg-card rounded-3xl p-8 md:p-10 boty-shadow"
              >
                <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-5">
                  {s.heading}
                </h2>
                <div className="space-y-4">
                  {s.body.map((p, i) => (
                    <p key={i} className="text-muted-foreground leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
