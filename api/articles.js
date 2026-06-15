// Obol - public article list (previews only, no gated body)
import { getArticles } from "../lib/content.js"

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  if (req.method === "OPTIONS") { res.status(204).end(); return }
  try {
    const list = await getArticles()
    res.status(200).json({
      source: process.env.GHOST_URL ? "ghost" : "seed",
      articles: list.map((a) => ({ id: a.id, title: a.title, author: a.author, minutes: a.minutes, preview: a.preview })),
    })
  } catch (e) {
    res.status(502).json({ error: "content error", detail: String((e && e.message) || e) })
  }
}
