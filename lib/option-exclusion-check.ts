import type { BulkQuestion } from "@/lib/question-bulk-json"

/**
 * Ausschluss-Check: Welche Antwortoptionen kann man OHNE Fachwissen streichen?
 *
 * Der deterministische Erkenner (lib/option-cues.ts) fängt Wortmuster —
 * Länge, Begründungszusätze, Pauschal- und Absicherungswörter. Die Messung
 * zeigte aber, dass ein Großteil des Verrats inhaltlich ist: Distraktoren, die
 * sich schon ohne Kenntnis der Frage als unplausibel entlarven, und eine
 * richtige Antwort, die als einzige "vernünftig" klingt. Das erkennt nur ein
 * Leser, kein Muster.
 *
 * Deshalb liest ein Modell die fünf Optionen OHNE Fragestellung — in
 * zufälliger Reihenfolge, damit es keine Positionsgewohnheit ausnutzen kann —
 * und nennt, was es ohne Fachwissen ausschließen würde. Genau das ist der
 * Befund aus der Praxis: "Es ist suggestiv ersichtlich, welche
 * Antwortoptionen sicher falsch sind."
 *
 * Fail-open: Scheitert der Aufruf, bleibt die Frage unverändert.
 */

export type ExclusionFn = (input: string) => Promise<string>

export type ExclusionResult = {
  /** Indizes (Originalreihenfolge) der Optionen, die sich ohne Fachwissen streichen lassen. */
  ausschliessbar: { index: number; grund: string }[]
  /**
   * Option, die der Prüfer ohne Fragestellung wählen würde — nur gesetzt,
   * wenn er sich dabei SICHER ist. Ein unsicherer Tipp ist kein Befund:
   * Bei fünf gleichwertigen Optionen trifft auch ein guter Rater in 20 % der
   * Fälle zufällig; eine Nachbesserung wäre dann bloß teuer.
   */
  verdaechtig: { index: number; grund: string } | null
}

/**
 * Standardmäßig AUS — bewusst.
 *
 * Die erste Fassung schlug in 2 von 27 Entwürfen an und senkte die
 * Erratbarkeit messbar nicht. Die überarbeitete Fassung (sicherer Tipp statt
 * "sicher streichbar") ist noch ungemessen: Die Messung scheiterte am
 * erschöpften OpenAI-Guthaben. Jeder Check kostet pro Frage bzw. Teilfrage
 * einen zusätzlichen Aufruf und erhöht den Druck auf Rate-Limit und Guthaben.
 * Einschalten mit GENERATOR_OPTION_CHECK=1, sobald eine Messung den Nutzen belegt.
 */
export function optionCheckEnabled(): boolean {
  const raw = process.env.GENERATOR_OPTION_CHECK?.trim().toLowerCase()
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes"
}

export const EXCLUSION_INSTRUCTIONS = `Du bist ein extrem prüfungserfahrener Ratestratege. Du kennst jeden Trick, mit dem man Single-Choice-Fragen ohne Fachwissen löst: übertriebene Pauschalaussagen, sichtbar schiefe Begründungen, Dringlichkeitswörter, die einzige abwägende Formulierung, auffällige Länge, Absicherungen, Kategoriebrüche, Optionen, die schon für Laien absurd oder gefährlich klingen.

Dir werden NUR die fünf Antwortoptionen einer medizinischen Single-Choice-Frage gezeigt — die Fragestellung NICHT. Nutze KEIN Detailwissen über das konkrete Thema, sondern ausschließlich das, was sich aus Form, Wortwahl und allgemeiner Plausibilität ergibt.

Typische Verräter, auf die du achtest:
- Kategoriebruch: eine riskante Option zwischen harmlosen, eine ernsthafte Maßnahme zwischen unsinnigen.
- Prototyp: die bekannteste, "lehrbuchhafteste" Option der Kategorie.
- Die einzige abwägende, vollständige oder vorsichtige Formulierung zwischen pauschalen.
- Optionen, die sich durch Übertreibung selbst widerlegen ("alleinige", "ohne weitere", "dauerhaft").
- Das Thema der Frage selbst als Option.

Aufgabe:
1. Nenne jede Option, die du ohne die Fragestellung als FALSCH streichen würdest — mit kurzem Grund.
2. Welche Option würdest du ohne die Fragestellung wählen, und wie sicher bist du? "hoch" heißt: Ein prüfungsroutinierter Studierender würde sie auch ohne Fachwissen zu diesem Thema mit großer Sicherheit wählen. "niedrig" heißt: Du rätst zwischen mehreren gleich plausiblen Optionen.

Antworte ausschließlich als JSON:
{"ausschliessbar":[{"nr":1,"grund":"…"}],"tipp":{"nr":3,"sicherheit":"hoch","grund":"…"}}`

/**
 * Baut die Eingabe in einer zufälligen Reihenfolge. Rückgabe enthält die
 * Zuordnung Anzeige-Nummer → Originalindex, damit die Antwort zurückgerechnet
 * werden kann.
 */
export function buildExclusionInput(
  q: BulkQuestion,
  rand: () => number = Math.random
): { input: string; zuordnung: number[] } {
  const zuordnung = q.options.map((_, i) => i)
  for (let i = zuordnung.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rand() * (i + 1)))
    ;[zuordnung[i], zuordnung[j]] = [zuordnung[j], zuordnung[i]]
  }
  const zeilen = zuordnung.map((orig, pos) => `${pos + 1}) ${q.options[orig].text}`)
  return {
    input: `Antwortoptionen (Fragestellung bewusst nicht gezeigt; antworte als json):\n${zeilen.join("\n")}`,
    zuordnung,
  }
}

/** Liest die Antwort tolerant und rechnet auf die Originalreihenfolge zurück. */
export function parseExclusionResult(raw: string, zuordnung: number[]): ExclusionResult {
  const leer: ExclusionResult = { ausschliessbar: [], verdaechtig: null }
  let data: unknown
  try {
    const start = raw.indexOf("{")
    const ende = raw.lastIndexOf("}")
    data = JSON.parse(start >= 0 && ende > start ? raw.slice(start, ende + 1) : raw)
  } catch {
    return leer
  }
  const d = data as { ausschliessbar?: unknown; verdaechtig?: unknown }

  const zuIndex = (nr: unknown): number | null => {
    const n = Number(nr)
    if (!Number.isInteger(n) || n < 1 || n > zuordnung.length) return null
    return zuordnung[n - 1]
  }
  const grund = (g: unknown) => (typeof g === "string" ? g.trim().slice(0, 200) : "")

  const gesehen = new Set<number>()
  const ausschliessbar = (Array.isArray(d.ausschliessbar) ? d.ausschliessbar : [])
    .map((e) => {
      const eintrag = e as { nr?: unknown; grund?: unknown }
      const index = zuIndex(eintrag.nr)
      return index === null ? null : { index, grund: grund(eintrag.grund) }
    })
    .filter((e): e is { index: number; grund: string } => {
      if (!e || gesehen.has(e.index)) return false
      gesehen.add(e.index)
      return true
    })

  // Nur ein SICHERER Tipp zählt als Befund (siehe ExclusionResult).
  // "verdaechtig" wird für ältere Antworten weiterhin gelesen.
  const t = (d as { tipp?: unknown }).tipp as { nr?: unknown; sicherheit?: unknown; grund?: unknown } | null | undefined
  const alt = d.verdaechtig as { nr?: unknown; grund?: unknown } | null | undefined
  let verdaechtig: ExclusionResult["verdaechtig"] = null
  if (t && typeof t === "object") {
    const sicher = String(t.sicherheit ?? "").trim().toLowerCase() === "hoch"
    const idx = zuIndex(t.nr)
    if (sicher && idx !== null) verdaechtig = { index: idx, grund: grund(t.grund) }
  } else if (alt && typeof alt === "object") {
    const idx = zuIndex(alt.nr)
    if (idx !== null) verdaechtig = { index: idx, grund: grund(alt.grund) }
  }

  return { ausschliessbar, verdaechtig }
}

/**
 * Entscheidet, ob die Optionen nachgebessert werden müssen.
 *
 * Ausgelöst wird bei zwei oder mehr Distraktoren, die sich ohne Fachwissen
 * streichen lassen — dann steigt die Ratequote von 20 % auf mindestens 33 %
 * —, oder wenn die RICHTIGE Antwort ohne Fachwissen heraussticht.
 * Ein einzelner streichbarer Distraktor allein löst nichts aus: Das ist die
 * Schwelle, unterhalb derer eine zusätzliche Überarbeitung (~5 s) mehr kostet,
 * als sie bringt.
 */
export function needsOptionRework(q: BulkQuestion, r: ExclusionResult): boolean {
  const richtig = q.options.findIndex((o) => o.isCorrect)
  const distraktoren = r.ausschliessbar.filter((e) => e.index !== richtig)
  if (distraktoren.length >= 2) return true
  if (r.verdaechtig && r.verdaechtig.index === richtig) return true
  return false
}

/** Nachbesserungs-Auftrag aus dem Befund, in der Buchstabenzählung der Frage. */
export function buildExclusionRepairHint(q: BulkQuestion, r: ExclusionResult): string {
  const b = (i: number) => String.fromCharCode(65 + i)
  const richtig = q.options.findIndex((o) => o.isCorrect)
  const zeilen = [
    "INHALTLICH ERRATBAR — ein Prüfer, der NUR die Antwortoptionen sah (ohne Fragestellung), konnte:",
  ]
  for (const e of r.ausschliessbar.filter((x) => x.index !== richtig)) {
    zeilen.push(`- Option ${b(e.index)} ohne Fachwissen streichen: ${e.grund || "wirkt ohne Fachwissen falsch"}`)
  }
  if (r.verdaechtig && r.verdaechtig.index === richtig) {
    zeilen.push(
      `- die richtige Option ${b(richtig)} ohne Fachwissen erkennen: ${r.verdaechtig.grund || "sticht heraus"}`
    )
  }
  zeilen.push(
    "",
    "Überarbeite die Antwortoptionen so, dass sich ohne Fachwissen KEINE Option streichen und keine als richtig erkennen lässt:",
    "- Jeder genannte Distraktor wird durch eine Maßnahme bzw. Aussage ersetzt, die in einer benachbarten Konstellation tatsächlich richtig wäre und genauso sachlich, differenziert und plausibel klingt wie die richtige Antwort.",
    "- Sticht die richtige Antwort als bekanntestes Mitglied der Kategorie heraus, werden die Distraktoren ebenso bekannte, gleichrangige Mitglieder derselben Kategorie — keine Randfiguren.",
    "- Kein Kategoriebruch: Alle Optionen gehören zur selben Wertung (alle riskant bzw. alle ernsthafte Maßnahmen).",
    "- Die richtige Antwort verliert, was sie heraushebt (Ausgewogenheit, Vollständigkeit, Länge, Absicherung) — oder die Distraktoren erhalten dasselbe.",
    "- Keine Pauschal-, Absolut- oder Dringlichkeitswörter, keine Begründungszusätze.",
    "",
    "Die AUSSAGE der richtigen Option, ihre Position und die Markierung isCorrect bleiben unverändert. Genau eine Option bleibt für Fachkundige eindeutig die beste."
  )
  return zeilen.join("\n")
}
