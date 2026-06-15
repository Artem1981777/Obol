// Obol - x402 paywall with REAL on-chain settlement verification + replay protection (Arc Testnet)
import { getArticle } from "../../lib/content.js"

const PAYOUT = (process.env.PAYOUT_ADDRESS || "0xdc6778c5f8cc74b10aed11c48306d4cfc5737fbd").toLowerCase()
const USDC = "0x3600000000000000000000000000000000000000"
const CHAIN_ID = 5042002
const NETWORK = "arc-testnet"
const PRICE_ATOMIC = "50000" // 0.05 USDC (6 decimals)
const PRICE_USD = "$0.05"
const RPC_URL = process.env.RPC_URL || "https://rpc.testnet.arc.network"
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
const MAX_AGE_SECONDS = 600 // anti-replay freshness window

function spec(article, resource) {
  return {
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
  }
}

function extractTxHash(headerVal) {
  const v = String(headerVal).trim()
  if (/^0x[0-9a-fA-F]{64}$/.test(v)) return v
  try {
    const decoded = JSON.parse(Buffer.from(v, "base64").toString("utf8"))
    if (decoded && typeof decoded.txHash === "string") return decoded.txHash
    if (decoded && decoded.payload && typeof decoded.payload.txHash === "string") return decoded.payload.txHash
  } catch (e) { /* not base64 json */ }
  return v
}

async function rpc(method, params) {
  const r = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  })
  const j = await r.json()
  if (j.error) throw new Error(j.error.message || "rpc error")
  return j.result
}

function pad32(addr) {
  return ("0x" + "0".repeat(24) + addr.toLowerCase().replace(/^0x/, "")).toLowerCase()
}

async function verifyPayment(txHash) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return { ok: false, reason: "invalid tx hash format" }
  const receipt = await rpc("eth_getTransactionReceipt", [txHash])
  if (!receipt) return { ok: false, reason: "tx not found or not yet mined" }
  if (receipt.status !== "0x1") return { ok: false, reason: "tx reverted on-chain" }
  const wantTo = pad32(PAYOUT)
  const minVal = BigInt(PRICE_ATOMIC)
  for (const log of receipt.logs || []) {
    if ((log.address || "").toLowerCase() !== USDC.toLowerCase()) continue
    if (!log.topics || (log.topics[0] || "").toLowerCase() !== TRANSFER_TOPIC) continue
    if ((log.topics[2] || "").toLowerCase() !== wantTo) continue
    const value = BigInt(log.data)
    if (value >= minVal) {
      return { ok: true, value: value.toString(), from: "0x" + (log.topics[1] || "").slice(26), blockNumber: receipt.blockNumber }
    }
  }
  return { ok: false, reason: "no USDC Transfer to payTo for >= required amount in this tx" }
}

async function blockAgeSeconds(blockNumberHex) {
  if (!blockNumberHex) return null
  const block = await rpc("eth_getBlockByNumber", [blockNumberHex, false])
  if (!block || !block.timestamp) return null
  const ts = parseInt(block.timestamp, 16)
  return Math.floor(Date.now() / 1000) - ts
}

async function markUsed(txHash) {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) return { enabled: false, fresh: true }
  const key = "obol:tx:" + txHash.toLowerCase()
  const r = await fetch(url.replace(/\/+$/, "") + "/set/" + key + "/1/NX/EX/86400", {
    headers: { Authorization: "Bearer " + token },
  })
  const j = await r.json()
  return { enabled: true, fresh: j && j.result === "OK" }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Headers", "X-PAYMENT, Content-Type")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Expose-Headers", "X-PAYMENT-RESPONSE")
  if (req.method === "OPTIONS") { res.status(204).end(); return }

  const id = req.query.id
  const article = await getArticle(id)
  if (!article) { res.status(404).json({ error: "article not found" }); return }

  const host = req.headers["x-forwarded-host"] || req.headers.host || "obol-theta.vercel.app"
  const resource = "https://" + host + "/api/article/" + id

  const payment = req.headers["x-payment"]
  if (!payment) {
    res.status(402).json({ x402Version: 1, error: "payment required", accepts: [spec(article, resource)] })
    return
  }

  const txHash = extractTxHash(payment)
  let result
  try {
    result = await verifyPayment(txHash)
  } catch (e) {
    res.status(502).json({ error: "rpc verification error", detail: String((e && e.message) || e) })
    return
  }

  if (!result.ok) {
    res.status(402).json({ x402Version: 1, error: "payment verification failed: " + result.reason, accepts: [spec(article, resource)] })
    return
  }

  // M3b: freshness window (reject stale / leaked tx)
  let age = null
  try { age = await blockAgeSeconds(result.blockNumber) } catch (e) { age = null }
  if (age !== null && age > MAX_AGE_SECONDS) {
    res.status(402).json({ x402Version: 1, error: "payment expired: tx is " + age + "s old (max " + MAX_AGE_SECONDS + "s); send a fresh payment", accepts: [spec(article, resource)] })
    return
  }

  // M3b: one-time-use dedupe (optional KV-backed)
  let used = { enabled: false, fresh: true }
  try { used = await markUsed(txHash) } catch (e) { used = { enabled: false, fresh: true } }
  if (used.enabled && !used.fresh) {
    res.status(402).json({ x402Version: 1, error: "payment already redeemed (replay blocked)", accepts: [spec(article, resource)] })
    return
  }

  res.setHeader("X-PAYMENT-RESPONSE", Buffer.from(JSON.stringify({ success: true, txHash, network: NETWORK })).toString("base64"))
  res.status(200).json({
    id,
    title: article.title,
    body: article.body,
    receipt: {
      verified: true,
      network: NETWORK,
      asset: "USDC",
      amount: result.value,
      from: result.from,
      payTo: PAYOUT,
      txHash,
      explorer: "https://testnet.arcscan.app/tx/" + txHash,
      replayProtection: used.enabled ? "one-time-use (KV) + freshness " + MAX_AGE_SECONDS + "s" : "freshness " + MAX_AGE_SECONDS + "s (set KV_REST_API_URL/KV_REST_API_TOKEN for cross-request dedupe)",
      ageSeconds: age,
    },
  })
}
