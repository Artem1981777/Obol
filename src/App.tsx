import { useState } from "react"
import type { CSSProperties } from "react"

declare global {
  interface Window { ethereum?: any }
}

type Article = { id: string; title: string; author: string; minutes: number; preview: string }
type Receipt = { verified: boolean; amount?: string; from?: string; payTo?: string; txHash?: string; explorer?: string }
type ArtState = { status: "locked" | "connecting" | "paying" | "verifying" | "unlocked" | "error"; body?: string; receipt?: Receipt; error?: string }

const PRICE = "$0.05"
const API = "/api/article/"

const ARC = {
  chainId: "0x4cef52",
  chainName: "Arc Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://rpc.testnet.arc.network"],
  blockExplorerUrls: ["https://testnet.arcscan.app"],
}

const ARTICLES: Article[] = [
  {
    id: "a1",
    title: "Why subscriptions are killing independent writing",
    author: "gromov7.eth",
    minutes: 6,
    preview: "Every newsletter wants $8/month. Readers hit a wall after the third one and churn. The problem is not the price - it is the unit. Nobody wants a relationship with 40 publications...",
  },
  {
    id: "a2",
    title: "Nanopayments: the missing primitive of the creator economy",
    author: "gromov7.eth",
    minutes: 4,
    preview: "We talk about the creator economy as if it were solved. It is not. The settlement rail is wrong, and when the rail changes the business models it can carry change with it...",
  },
  {
    id: "a3",
    title: "How x402 turns any article into a storefront",
    author: "gromov7.eth",
    minutes: 5,
    preview: "HTTP 402 Payment Required sat dormant for thirty years. Coinbase woke it up. Here is what that means for a humble blog post...",
  },
]

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function encodeTransfer(to: string, amount: bigint): string {
  const addr = to.toLowerCase().replace(/^0x/, "").padStart(64, "0")
  const amt = amount.toString(16).padStart(64, "0")
  return "0xa9059cbb" + addr + amt
}

const page: CSSProperties = { maxWidth: "720px", margin: "0 auto", padding: "28px 20px", fontFamily: "Georgia, serif", color: "#1a1a1a" }
const topbar: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }
const brand: CSSProperties = { fontSize: "13px", letterSpacing: "4px", color: "#a67c2e", fontWeight: 700, fontFamily: "system-ui, sans-serif" }
const tagline: CSSProperties = { fontSize: "13px", color: "#777", marginTop: "2px", fontFamily: "system-ui, sans-serif" }
const connectBtn: CSSProperties = { padding: "8px 14px", border: "1px solid #1a1a1a", borderRadius: "999px", background: "#fff", color: "#1a1a1a", fontSize: "13px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "system-ui, sans-serif" }
const acctPill: CSSProperties = { padding: "8px 14px", borderRadius: "999px", background: "#eef6ee", color: "#1a7f37", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", fontFamily: "ui-monospace, monospace" }
const note: CSSProperties = { fontSize: "11px", color: "#9a6b00", background: "#fdf6e3", border: "1px solid #efe3bf", borderRadius: "8px", padding: "8px 12px", margin: "14px 0 24px", fontFamily: "system-ui, sans-serif" }
const card: CSSProperties = { borderTop: "1px solid #e5e5e5", padding: "24px 0" }
const h2: CSSProperties = { fontSize: "24px", margin: "0 0 6px", lineHeight: 1.25 }
const meta: CSSProperties = { fontSize: "12px", color: "#888", marginBottom: "12px", fontFamily: "system-ui, sans-serif" }
const text: CSSProperties = { fontSize: "16px", lineHeight: 1.7, color: "#333" }
const fade: CSSProperties = { fontSize: "16px", lineHeight: 1.7, color: "#aaa", fontStyle: "italic" }
const btn: CSSProperties = { marginTop: "14px", padding: "10px 18px", border: "none", borderRadius: "999px", background: "#1a1a1a", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "system-ui, sans-serif" }
const receiptBox: CSSProperties = { marginTop: "12px", fontSize: "12px", color: "#1a7f37", background: "#f3faf3", border: "1px solid #cfe9cf", borderRadius: "8px", padding: "8px 12px", fontFamily: "system-ui, sans-serif" }
const link: CSSProperties = { color: "#1a7f37", fontWeight: 600 }
const errText: CSSProperties = { marginTop: "10px", fontSize: "12px", color: "#b42318", fontFamily: "system-ui, sans-serif" }

function label(st?: ArtState) {
  switch (st && st.status) {
    case "connecting": return "Connecting..."
    case "paying": return "Confirm in wallet..."
    case "verifying": return "Verifying on-chain..."
    default: return "Unlock for " + PRICE + " USDC"
  }
}

export default function App() {
  const [acct, setAcct] = useState<string>("")
  const [states, setStates] = useState<Record<string, ArtState>>({})

  const patch = (id: string, p: Partial<ArtState>) =>
    setStates((s) => ({ ...s, [id]: { ...(s[id] || { status: "locked" }), ...p } as ArtState }))

  async function connect() {
    if (!window.ethereum) { alert("No EVM wallet found. Open this page in a wallet browser (e.g. MetaMask)."); return }
    const a: string[] = await window.ethereum.request({ method: "eth_requestAccounts" })
    setAcct(a[0])
  }

  async function ensureArc() {
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC.chainId }] })
    } catch (e: any) {
      if (e && e.code === 4902) {
        await window.ethereum.request({ method: "wallet_addEthereumChain", params: [ARC] })
      } else { throw e }
    }
  }

  async function unlock(id: string) {
    try {
      if (!window.ethereum) { patch(id, { status: "error", error: "No EVM wallet found" }); return }
      patch(id, { status: "connecting", error: undefined })
      const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" })
      const from = accounts[0]
      setAcct(from)
      await ensureArc()
      const specRes = await fetch(API + id)
      const specJson: any = await specRes.json()
      const req = specJson.accepts[0]
      const data = encodeTransfer(req.payTo, BigInt(req.maxAmountRequired))
      patch(id, { status: "paying" })
      const txHash: string = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from, to: req.asset, data, value: "0x0" }],
      })
      patch(id, { status: "verifying" })
      for (let i = 0; i < 24; i++) {
        const r = await fetch(API + id, { headers: { "X-PAYMENT": txHash } })
        if (r.status === 200) {
          const j: any = await r.json()
          patch(id, { status: "unlocked", body: j.body, receipt: j.receipt })
          return
        }
        await sleep(3000)
      }
      patch(id, { status: "error", error: "Timed out waiting for on-chain settlement" })
    } catch (e: any) {
      patch(id, { status: "error", error: String((e && e.message) || e) })
    }
  }

  return (
    <div style={page}>
      <div style={topbar}>
        <div>
          <div style={brand}>OBOL</div>
          <div style={tagline}>Pay-per-article on Arc - make the smallest unit sellable.</div>
        </div>
        {acct
          ? <span style={acctPill}>{acct.slice(0, 6)}...{acct.slice(-4)}</span>
          : <button style={connectBtn} onClick={connect}>Connect wallet</button>}
      </div>
      <div style={note}>Live on Arc Testnet - "Unlock" sends a real {PRICE} USDC transfer; the server verifies on-chain settlement before returning the article.</div>
      {ARTICLES.map((a) => {
        const st = states[a.id]
        const unlocked = !!st && st.status === "unlocked"
        const busy = !!st && (st.status === "connecting" || st.status === "paying" || st.status === "verifying")
        return (
          <article key={a.id} style={card}>
            <h2 style={h2}>{a.title}</h2>
            <div style={meta}>{a.author} - {a.minutes} min read</div>
            <p style={text}>{a.preview}</p>
            {unlocked ? (
              <>
                <p style={text}>{st.body}</p>
                <div style={receiptBox}>
                  Unlocked - paid {(Number((st.receipt && st.receipt.amount) || 0) / 1e6).toFixed(2)} USDC on Arc -{" "}
                  <a style={link} href={st.receipt && st.receipt.explorer} target="_blank" rel="noreferrer">view tx</a>
                </div>
              </>
            ) : (
              <>
                <p style={fade}>The rest of this article is locked.</p>
                <button style={btn} disabled={busy} onClick={() => unlock(a.id)}>{label(st)}</button>
                {st && st.status === "error" && <div style={errText}>{st.error} - tap to retry</div>}
              </>
            )}
          </article>
        )
      })}
    </div>
  )
}
