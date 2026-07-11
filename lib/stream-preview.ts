/**
 * Extrahiert aus dem (noch unvollständigen) gestreamten JSON-Text eine
 * menschenlesbare Live-Vorschau: Fragestellung + Antwortoptionen, während das
 * Modell noch schreibt. Rein funktional und tolerant gegenüber abgeschnittenem
 * JSON — nie werfen.
 */

export type LivePreviewPhase =
  | "start"
  | "stem"
  | "options"
  | "explanations"
  | "polishing"

export type LivePreview = {
  stem: string | null
  options: string[]
  phase: LivePreviewPhase
}

/**
 * Liest ab der Position eines öffnenden Anführungszeichens den Inhalt eines
 * JSON-Strings — auch wenn er noch nicht geschlossen ist. Gibt den (leicht
 * ent-escapten) Inhalt und ob der String vollständig war zurück.
 */
function readStringAt(s: string, openQuoteIdx: number): { value: string; complete: boolean } {
  let out = ""
  let i = openQuoteIdx + 1
  while (i < s.length) {
    const ch = s[i]
    if (ch === "\\") {
      const next = s[i + 1]
      if (next === undefined) {
        // Escape am Stream-Ende — abgeschnitten.
        return { value: out, complete: false }
      }
      switch (next) {
        case "n":
          out += "\n"
          break
        case "t":
          out += "\t"
          break
        case '"':
          out += '"'
          break
        case "\\":
          out += "\\"
          break
        case "/":
          out += "/"
          break
        default:
          out += next
      }
      i += 2
      continue
    }
    if (ch === '"') {
      return { value: out, complete: true }
    }
    out += ch
    i += 1
  }
  return { value: out, complete: false }
}

function findValueString(s: string, key: string): { value: string; complete: boolean } | null {
  const keyIdx = s.indexOf(`"${key}"`)
  if (keyIdx < 0) return null
  const colon = s.indexOf(":", keyIdx + key.length + 2)
  if (colon < 0) return null
  const quote = s.indexOf('"', colon + 1)
  if (quote < 0) return null
  return readStringAt(s, quote)
}

export function extractLivePreview(full: string): LivePreview {
  const stemRes = findValueString(full, "stem")
  const stem = stemRes ? stemRes.value.trim() || null : null

  // Alle "text": "..." als Optionstexte einsammeln.
  const options: string[] = []
  const re = /"text"\s*:\s*"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(full)) !== null) {
    const quoteIdx = m.index + m[0].length - 1
    const res = readStringAt(full, quoteIdx)
    const val = res.value.trim()
    if (val) options.push(val)
    // Nur vollständige Strings weiter scannen lassen; readStringAt setzt re.lastIndex nicht.
  }

  let phase: LivePreviewPhase = "start"
  const hasExplanations =
    full.includes('"explanation"') || full.includes('"keyTakeaway"')
  const hasHighYield = full.includes('"highYield"') || full.includes('"mustKnow"')
  if (hasHighYield) phase = "polishing"
  else if (hasExplanations) phase = "explanations"
  else if (options.length > 0) phase = "options"
  else if (stem) phase = "stem"

  return { stem, options, phase }
}

export const PREVIEW_PHASE_LABEL: Record<LivePreviewPhase, string> = {
  start: "Frage wird konstruiert…",
  stem: "Fragestellung entsteht…",
  options: "Antwortoptionen entstehen…",
  explanations: "Erklärungen werden geschrieben…",
  polishing: "Lern-Transfer & Merkhilfen…",
}
