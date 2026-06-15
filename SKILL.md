# SKILL: Obol x402 Pay-per-Article

## Capability
Pay (or charge) a USDC nanopayment over HTTP 402 on Arc to unlock one article.
Works for humans and agents.

## Protocol
1. GET /api/article/{id} with no payment -> 402 + accepts:[{ scheme:"exact",
   network:"arc-testnet", maxAmountRequired:"50000", asset, payTo, ... }].
2. Pay USDC transfer(payTo, 50000) on Arc Testnet (chainId 5042002,
   USDC 0x3600000000000000000000000000000000000000).
3. Retry with header X-PAYMENT: <txHash> -> 200 + { body, receipt }.

## Constraints
- 0.05 USDC (50000 atomic, 6 decimals) per article.
- Payment must settle within 600s (freshness); tx hash single-use when KV enabled.

## Honest framing
Self-hosted on-chain verification, not a full x402 facilitator. All payments are
real on-chain transfers; no mocked data. Payout direct to PAYOUT_ADDRESS.
