import { useState } from "react"
import type { CSSProperties } from "react"

type Article = { id: string; title: string; author: string; minutes: number; preview: string; body: string }

const PRICE = "$0.05"

const ARTICLES: Article[] = [
  {
    id: "a1",
    title: "Why subscriptions are killing independent writing",
    author: "gromov7.eth",
    minutes: 6,
    preview: "Every newsletter wants $8/month. Readers hit a wall after the third one and churn. The problem is not the price - it is the unit. Nobody wants a relationship with 40 publications...",
    body: "The smallest sellable unit of writing has always been the article, but the web never had a way to sell it. Card fees ate anything under a dollar, so publishers bundled everything into subscriptions. x402 changes the unit economics: a reader pays a few cents over HTTP, settles in USDC on Arc in under two seconds, and the author is paid instantly with no intermediary.",
  },
  {
    id: "a2",
    title: "Nanopayments: the missing primitive of the creator economy",
    author: "gromov7.eth",
    minutes: 4,
    preview: "We talk about the creator economy as if it were solved. It is not. The settlement rail is wrong, and when the rail changes the business models it can carry change with it...",
    body: "A nanopayment is a payment so small that traditional rails make it impossible. At five cents, a 30-cent card fee is a non-starter. Stablecoin transfers on Arc cost a fraction of a cent and settle on-chain with no chargebacks. That single fact unlocks pay-per-paragraph, pay-per-minute, and pay-per-query - the genuinely smallest sellable units.",
  },
  {
    id: "a3",
    title: "How x402 turns any article into a storefront",
    author: "gromov7.eth",
    minutes: 5,
    preview: "HTTP 402 Payment Required sat dormant for thirty years. Coinbase woke it up. Here is what that means for a humble blog post...",
    body: "When a reader requests a locked article, the server answers 402 with a payment specification: amount, asset (USDC), network (Arc), and the author payout address. The reader wallet signs and pays, the request is retried, and the server returns 200 with the full body plus an on-chain receipt. No accounts, no sessions, no Stripe.",
  },
]

const page: CSSProperties = { maxWidth: "720px", margin: "0 auto", padding: "32px 20px", fontFamily: "Georgia, serif", color: "#1a1a1a" }
const brand: CSSProperties = { fontSize: "13px", letterSpacing: "4px", color: "#a67c2e", fontWeight: 700, fontFamily: "system-ui, sans-serif" }
const tagline: CSSProperties = { fontSize: "13px", color: "#777", marginTop: "2px", marginBottom: "8px", fontFamily: "system-ui, sans-serif" }
const note: CSSProperties = { fontSize: "11px", color: "#9a6b00", background: "#fdf6e3", border: "1px solid #efe3bf", borderRadius: "8px", padding: "8px 12px", margin: "12px 0 28px", fontFamily: "system-ui, sans-serif" }
const card: CSSProperties = { borderTop: "1px solid #e5e5e5", padding: "24px 0" }
const h2: CSSProperties = { fontSize: "24px", margin: "0 0 6px", lineHeight: 1.25 }
const meta: CSSProperties = { fontSize: "12px", color: "#888", marginBottom: "12px", fontFamily: "system-ui, sans-serif" }
const text: CSSProperties = { fontSize: "16px", lineHeight: 1.7, color: "#333" }
const fade: CSSProperties = { fontSize: "16px", lineHeight: 1.7, color: "#aaa", fontStyle: "italic" }
const btn: CSSProperties = { marginTop: "14px", padding: "10px 18px", border: "none", borderRadius: "999px", background: "#1a1a1a", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "system-ui, sans-serif" }
const paid: CSSProperties = { marginTop: "10px", fontSize: "12px", color: "#1a7f37", fontFamily: "system-ui, sans-serif" }

export default function App() {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  return (
    <div style={page}>
      <div style={brand}>OBOL</div>
      <div style={tagline}>Pay-per-article nanopayments on Arc - make the smallest unit sellable.</div>
      <div style={note}>MVP shell (M0). Unlock is a local demo - real x402 / USDC-on-Arc payment is wired in M1-M2.</div>
      {ARTICLES.map((a) => {
        const isOpen = !!open[a.id]
        return (
          <article key={a.id} style={card}>
            <h2 style={h2}>{a.title}</h2>
            <div style={meta}>{a.author} - {a.minutes} min read</div>
            <p style={text}>{a.preview}</p>
            {isOpen ? (
              <>
                <p style={text}>{a.body}</p>
                <div style={paid}>Unlocked - paid {PRICE} USDC to {a.author}</div>
              </>
            ) : (
              <>
                <p style={fade}>The rest of this article is locked.</p>
                <button style={btn} onClick={() => setOpen((s) => ({ ...s, [a.id]: true }))}>Unlock for {PRICE} USDC</button>
              </>
            )}
          </article>
        )
      })}
    </div>
  )
}
