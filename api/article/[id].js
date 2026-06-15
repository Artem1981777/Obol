// Obol M1 - x402 paywall endpoint (402 handshake)
// Free preview is served by the static frontend; this endpoint gates the FULL body.
// M1: returns a spec-shaped 402 when unpaid. Real on-chain verification arrives in M2.

const PAYOUT = process.env.PAYOUT_ADDRESS || "0xdc6778c5f8cc74b10aed11c48306d4cfc5737fbd"
const USDC = "0x3600000000000000000000000000000000000000"
const CHAIN_ID = 5042002
const NETWORK = "arc-testnet"
const PRICE_ATOMIC = "50000" // 0.05 USDC (6 decimals)
const PRICE_USD = "$0.05"

const ARTICLES = {
  a1: {
    title: "Why subscriptions are killing independent writing",
    body: "The smallest sellable unit of writing has always been the article, but the web never had a way to sell it. Card fees ate anything under a dollar, so publishers bundled everything into subscriptions. x402 changes the unit economics: a reader pays a few cents over HTTP, settles in USDC on Arc in under two seconds, and the author is paid instantly with no intermediary.",
  },
  a2: {
    title: "Nanopayments: the missing primitive of the creator economy",
    body: "A nanopayment is a payment so small that traditional rails make it impossible. At five cents, a 30-cent card fee is a non-starter. Stablecoin transfers on Arc cost a fraction of a cent and settle on-chain with no chargebacks. That single fact unlocks pay-per-paragraph, pay-per-minute, and pay-per-query - the genuinely smallest sellable units.",
  },
  a3: {
    title: "How x402 turns any article into a storefront",
    body: "When a reader requests a locked article, the server answers 402 with a payment specification: amount, asset (USDC), network (Arc), and the author payout address. The reader wallet signs and pays, the request is retried, and the server returns 200 with the full body plus an on-chain receipt. No accounts, no sessions, no Stripe.",
  },
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Headers", "X-PAYMENT, Content-Type")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Expose-Headers", "X-PAYMENT-RESPONSE")
  if (req.method === "OPTIONS") { res.status(204).end(); return }

  const id = req.query.id
  const article = ARTICLES[id]
  if (!article) { res.status(404).json({ error: "article not found" }); return }

  const host = req.headers["x-forwarded-host"] || req.headers.host || "obol-theta.vercel.app"
  const resource = "https://" + host + "/api/article/" + id

  const payment = req.headers["x-payment"]
  if (!payment) {
    res.status(402).json({
      x402Version: 1,
      error: "payment required",
      accepts: [
        {
          scheme: "exact",
          network: NETWORK,
          maxAmountRequired: PRICE_ATOMIC,
          resource,
          description: "Unlock: " + article.title,
          mimeType: "application/json",
          payTo: PAYOUT,
          maxTimeoutSeconds: 120,
          asset: USDC,
          extra: { name: "USDC", decimals: 6, chainId: CHAIN_ID, priceUsd: PRICE_USD },
        },
      ],
    })
    return
  }

  // M1 STUB: header presence is accepted; real on-chain USDC settlement check lands in M2.
  res.status(200).json({
    id,
    title: article.title,
    body: article.body,
    receipt: {
      verified: false,
      note: "M1 stub - on-chain USDC settlement verification is wired in M2",
      payment: String(payment).slice(0, 120),
    },
  })
}
