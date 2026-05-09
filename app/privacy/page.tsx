import { Header } from "@/components/boty/header"
import { Footer } from "@/components/boty/footer"
import { PageHero } from "@/components/boty/page-hero"

const sections = [
  {
    heading: "What we collect",
    body: [
      "When you place an order: your name, email, shipping/billing addresses, and the items you bought. We need this to fulfill the order — there's no useful version without it.",
      "When you browse: anonymous analytics about which pages you view, which products you click, and which buttons you tap. We use this to learn what's working on the site, not to identify you.",
      "When you contact us: anything you type into a contact form, plus the email address you give us so we can reply.",
      "When you subscribe to email: just your email address and the moment you signed up.",
    ],
  },
  {
    heading: "What we don't collect",
    body: [
      "We don't store your full credit card number or CVC. Payments are processed by certified PCI-compliant gateways — your card details never touch our servers.",
      "We don't sell your data. Not now, not later, not in aggregate, not in any form. Your information stays with us and the small list of vendors below.",
      "We don't track you across other websites. We don't run third-party advertising pixels for retargeting elsewhere on the web.",
    ],
  },
  {
    heading: "How we use it",
    body: [
      "To process your orders, send shipping confirmations, handle returns, and get you support when you ask.",
      "To improve the site — which products to feature, which copy needs work, where the checkout is confusing.",
      "To send you emails you've opted into. You can unsubscribe with one click; we don't make it complicated.",
    ],
  },
  {
    heading: "Who we share it with",
    body: [
      "Our shipping carriers, only the address fields they need to deliver your parcel.",
      "Our payment processors, only the transaction data they need to charge you.",
      "Supabase, our backend storage provider, where order and analytics data lives.",
      "Vercel, where the site is hosted. They see request logs but never your personal data.",
      "We will never share data with anyone else, except where legally required.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "Ask for a copy of everything we hold about you — we'll send it in a readable format within 14 days.",
      "Ask us to correct anything that's wrong.",
      "Ask us to delete your account and all associated personal data. We'll keep transactional records (invoices) for the legally required period and remove the rest.",
      "Withdraw consent for marketing emails at any time.",
    ],
  },
  {
    heading: "Cookies",
    body: [
      "Essential cookies keep your cart and login working — these can't be disabled because the site doesn't function without them.",
      "Analytics cookies are first-party only, anonymous, and aggregated. They tell us 'pageviews' and 'clicks', not 'who'.",
      "We don't use third-party advertising cookies.",
    ],
  },
  {
    heading: "Children",
    body: [
      "Our products are formulated for adult skin. We don't knowingly collect personal data from anyone under 16. If you believe a child has given us their data, write to us and we'll delete it.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "Questions, deletion requests, or just curious about how we handle data? Write to privacy@droat.co. We aim to reply within two business days.",
    ],
  },
]

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <section className="pt-28 pb-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <PageHero
            eyebrow="Privacy"
            title="Privacy Policy"
            description="A plain-language summary of what we collect, what we never collect, and how to ask us to delete it. Last updated 5 November 2025."
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

          <p className="text-center text-sm text-muted-foreground mt-12">
            We may update this policy from time to time. Material changes will be announced by email if you have an account with us.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  )
}
