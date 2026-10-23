import { ImageResponse } from "next/og"
import { loadPublicQuestion } from "@/lib/public-question"

export const runtime = "nodejs"

function kurz(s: string, n: number) {
  const t = s.replace(/\s+/g, " ").trim()
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t
}

/** Lange Fälle: Anfang kürzen, die eigentliche Frage (letzter Satz) behalten. */
function stammKurz(stem: string, n: number) {
  const t = stem.replace(/\s+/g, " ").trim()
  if (t.length <= n) return t
  const saetze = t.match(/[^.!?]+[.!?]+/g) ?? [t]
  const frage = saetze[saetze.length - 1].trim()
  const rest = n - frage.length - 2
  if (rest < 60) return kurz(frage, n)
  return `${kurz(t.slice(0, t.length - frage.length), rest)} ${frage}`
}

/**
 * Vorschaubild einer geteilten Frage (WhatsApp, Instagram-Story, Discord …).
 * Zeigt Frage und Optionen — nie die Lösung.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const d = await loadPublicQuestion(id, { shuffle: false })
  if (!d) return new Response("not found", { status: 404 })
  const stem = stammKurz(d.question.stem, d.question.options.length > 4 ? 205 : 260)
  const optionen = d.question.options.slice(0, 5).map((o) => kurz(o.text, 70))

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#071619", color: "#f1f5f4", padding: "56px 64px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#5eead4" }}>
          <span>fragenkreuzen.de</span>
          <span style={{ color: "#94a3a8" }}>{kurz(d.topic, 40)} · Stufe {d.difficulty}/5</span>
        </div>
        <div style={{ marginTop: 24, fontSize: 32, lineHeight: 1.3, fontWeight: 600, display: "flex" }}>{stem}</div>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {optionen.map((o, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 24, color: "#cbd5d3" }}>
              <span style={{ display: "flex", width: 40, height: 40, borderRadius: 20, border: "2px solid #2dd4bf", alignItems: "center", justifyContent: "center", color: "#5eead4", fontWeight: 700 }}>
                {String.fromCharCode(65 + i)}
              </span>
              <span style={{ display: "flex" }}>{o}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } }
  )
}
