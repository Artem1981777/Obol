# Obol — x402 Pay-per-Article on Arc

Pay a few cents to read one article. No subscription, no account, no Stripe.
Obol makes the smallest sellable unit of writing — one article — a storefront
via HTTP 402 and USDC settlement on Arc.

Live: https://obol-theta.vercel.app
Built for Lepton (Arc x Canteen x Circle) — bonus track.

## How it works
1. Preview is free; the full body is locked.
2. "Unlock for $0.05" sends a real USDC transfer on Arc Testnet to the author.
3. Server verifies settlement on-chain, then returns the body + an on-chain receipt.

## Real vs simplified
- LIVE: 402 handshake, real USDC transfer on Arc, on-chain settlement verify,
  replay protection (freshness 600s + optional KV one-time-use).
- SIMPLIFIED: self-hosted verifier, not a full x402 facilitator; no subs/refunds.
- No fake data — every unlock is a real on-chain payment.

## Endpoints
- GET /api/articles — public list (preview only).
- GET /api/article/:id — 402 if unpaid; 200 + body + receipt if paid (tx hash in X-PAYMENT header).

## Content
Ghost Content API when GHOST_URL + GHOST_CONTENT_KEY are set; else built-in seed articles.

## Env (all optional)
PAYOUT_ADDRESS, RPC_URL, GHOST_URL, GHOST_CONTENT_KEY, KV_REST_API_URL, KV_REST_API_TOKEN.

## Arc Testnet
chainId 5042002 (0x4cef52); USDC 0x3600000000000000000000000000000000000000 (6 decimals);
RPC https://rpc.testnet.arc.network; explorer https://testnet.arcscan.app

## Stack
Vite + React + TS, Vercel serverless (Node ESM), no payment SDK —
raw eth_sendTransaction + JSON-RPC verification. MIT.
