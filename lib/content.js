// Obol content source: Ghost Content API when configured, else built-in seed articles.

const SEED = [
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

function stripHtml(s) {
  return String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
}

async function fromGhost() {
  const base = process.env.GHOST_URL
  const key = process.env.GHOST_CONTENT_KEY
  if (!base || !key) return null
  const url = base.replace(/\/+$/, "") + "/ghost/api/content/posts/?key=" + key + "&limit=all&include=authors&formats=html"
  const r = await fetch(url)
  if (!r.ok) return null
  const j = await r.json()
  const posts = (j && j.posts) || []
  return posts.map((p) => {
    const body = stripHtml(p.html)
    const author = (p.authors && p.authors[0] && p.authors[0].name) || "Unknown"
    const preview = (p.excerpt && String(p.excerpt).trim()) || body.slice(0, 220) + "..."
    return { id: p.slug || String(p.id), title: p.title || "Untitled", author, minutes: p.reading_time || 3, preview, body }
  })
}

let cache = null
let cacheAt = 0

async function getArticles() {
  const now = Date.now()
  if (cache && now - cacheAt < 60000) return cache
  let list = null
  try { list = await fromGhost() } catch (e) { list = null }
  cache = list && list.length ? list : SEED
  cacheAt = now
  return cache
}

async function getArticle(id) {
  const list = await getArticles()
  return list.find((a) => a.id === id) || null
}

export { getArticles, getArticle }
