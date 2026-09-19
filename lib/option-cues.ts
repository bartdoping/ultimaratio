import type { BulkQuestion } from "@/lib/question-bulk-json"

/**
 * Erkennung formaler Lösungshinweise in Antwortoptionen.
 *
 * Eine Single-Choice-Frage ist defekt, wenn man die richtige Antwort ohne
 * Fachwissen an FORM oder WORTWAHL erkennen kann — Prüfungsforschung nennt das
 * "testwiseness". Typische Signale, die in generierten Fragen tatsächlich
 * auftraten:
 *
 *  - Begründungen nur in den Distraktoren ("… zur Nierenperfusion",
 *    "… weil mitochondriale Enzyme …"): Die falsche Option argumentiert für
 *    sich selbst — mit einem sichtbar schiefen Grund.
 *  - Dringlichkeits- und Absolutwörter nur in den Distraktoren
 *    ("Sofortige …", "Unverzügliche …", "ausschließlich …").
 *  - Absicherungen nur in der richtigen Antwort ("… unter engmaschiger
 *    Blutdruckkontrolle"): Die vorsichtige Option ist fast immer die richtige.
 *  - Die richtige Antwort ist auffällig länger (oder kürzer) als die übrigen.
 *
 * Entscheidend ist nicht, OB ein Merkmal vorkommt, sondern ob die richtige
 * Antwort damit aus der Reihe fällt. Tragen alle fünf Optionen eine
 * Begründung, verrät das nichts; trägt sie nur die richtige nicht, schon.
 *
 * Bewusst deterministisch und ohne Modellaufruf: Der Test ist nachvollziehbar,
 * kostet keine Latenz und lässt sich mit festen Beispielen prüfen.
 */

export type CueKind = "begruendung" | "dringlichkeit" | "absicherung" | "laenge" | "themenecho"

export type OptionCue = {
  questionIndex: number
  kind: CueKind
  /** "stark": richtige Antwort ist allein; "mittel": sie teilt das Merkmal mit nur einer Option. */
  staerke: "stark" | "mittel"
  detail: string
}

/**
 * Zweck- und Begründungskonstruktionen. Absichtlich eng gefasst: Ein bloßes
 * "zum" ("Überweisung zum Kardiologen") ist keine Begründung, "zur Senkung
 * der Vorlast" schon.
 */
const BEGRUENDUNG =
  /\bzur\s+\p{L}+(?:ung|ion|tät|ierung|nahme)\b|\bzum\s+(?:Ausschluss|Schutz|Nachweis|Erhalt|Ausgleich|Zweck|Ziel)\b|\bum\s[^,.;]{1,60}?\szu\s|\b(?:weil|da|deshalb|daher|dadurch|wodurch|wegen|aufgrund|infolge)\b|\bbei\s+(?:vermutete[mnrs]?|Verdacht\s+auf)\b/iu

/**
 * Dringlichkeit und Absolutheit — beides lässt eine Option "zu forsch" wirken.
 * Pauschalwörter wie "alleinige", "dauerhaft", "unverändert", "ohne weitere"
 * waren in der Messung das häufigste inhaltliche Signal: Die Distraktoren
 * widerlegen sich damit selbst, die richtige Antwort ist die einzige, die abwägt.
 */
const DRINGLICHKEIT =
  /\b(?:sofort\p{L}*|unverzüglich\p{L}*|umgehend\p{L}*|notfallmäßig\p{L}*|immer|niemals|nie|ausschließlich\p{L}*|stets|grundsätzlich\p{L}*|keinesfalls|in\s+jedem\s+Fall|alleinig\p{L}*|allein|dauerhaft\p{L}*|unverändert\p{L}*|einzig\p{L}*|ohne\s+weitere\p{L}*|irreversibel\p{L}*|vollständig\s+aus\p{L}*|sicher\s+aus\p{L}*)\b/iu

/** Absicherungen — die "vorsichtige" Formulierung, die Prüflinge reflexhaft wählen. */
const ABSICHERUNG =
  /\b(?:engmaschig\p{L}*|unter\s+(?:Kontrolle|Monitoring|Überwachung|Berücksichtigung|Beachtung)|nach\s+Ausschluss|vorsichtig\p{L}*|titriert\p{L}*|niedrig\s+dosiert\p{L}*|schrittweise\p{L}*|individuell\p{L}*|angepasst\p{L}*)\b/iu

/** Ab welcher Abweichung vom Mittel der Distraktoren eine Länge auffällt. */
// Gemessen war die richtige Antwort in 41 % der Fragen die längste (Zufall
// 20 %) — meist nicht extrem, sondern um 15–25 % länger. Die frühere Schwelle
// von 1,3 fing nur die Ausreißer.
const LAENGE_OBEN = 1.12
const LAENGE_UNTEN = 0.8
// Zusätzlich ein absoluter Mindestabstand zum Mittel: Bei kurzen, gleich
// gebauten Optionen ("Intravenöse Gabe von Nitroglycerin" gegen "… von
// Furosemid") sind 12 % nur vier Zeichen — das ist ein Wirkstoffname, kein
// Hinweis. In den verräterischen Fällen der Messung lag der Abstand bei 21–54.
const LAENGE_MIN_ABSTAND = 12

type Merkmal = { kind: Exclude<CueKind, "laenge">; muster: RegExp; name: string }

const MERKMALE: Merkmal[] = [
  { kind: "begruendung", muster: BEGRUENDUNG, name: "eine Begründung oder Zweckangabe" },
  { kind: "dringlichkeit", muster: DRINGLICHKEIT, name: "ein Dringlichkeits-, Absolut- oder Pauschalwort" },
  { kind: "absicherung", muster: ABSICHERUNG, name: "eine Absicherung" },
]

const buchstabe = (i: number) => String.fromCharCode(65 + i)

/**
 * Prüft, ob die richtige Antwort bei einem Merkmal aus der Reihe fällt.
 *
 * "stark":  sie ist die EINZIGE mit (oder ohne) dem Merkmal — Trefferquote
 *           für Ratende 100 %.
 * "mittel": sie teilt ihre Ausprägung mit genau einer weiteren Option —
 *           Ratende sind bei 50 % statt 20 %.
 */
function aussenseiter(
  richtigHat: boolean,
  distraktorenMit: number,
  anzahlDistraktoren: number
): "stark" | "mittel" | null {
  const distraktorenOhne = anzahlDistraktoren - distraktorenMit
  const gleichgesinnte = richtigHat ? distraktorenMit : distraktorenOhne
  if (gleichgesinnte === 0) return "stark"
  if (gleichgesinnte === 1 && anzahlDistraktoren >= 4) return "mittel"
  return null
}

/** Kleinschreibung, Satzzeichen raus, Leerraum zusammengefasst — für Textvergleiche. */
function normalisiert(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

export function detectOptionCues(questions: BulkQuestion[], topic?: string): OptionCue[] {
  const cues: OptionCue[] = []
  const thema = topic ? normalisiert(topic) : ""

  questions.forEach((q, qi) => {
    const richtigIdx = q.options.findIndex((o) => o.isCorrect)
    if (richtigIdx < 0 || q.options.length < 3) return

    const richtig = q.options[richtigIdx].text
    const distraktoren = q.options.filter((_, i) => i !== richtigIdx).map((o) => o.text)
    const where = `Frage ${qi + 1}`

    for (const m of MERKMALE) {
      const richtigHat = m.muster.test(richtig)
      const mit = distraktoren.filter((t) => m.muster.test(t)).length
      const staerke = aussenseiter(richtigHat, mit, distraktoren.length)
      if (!staerke) continue

      const betroffen = q.options
        .map((o, i) => (m.muster.test(o.text) ? buchstabe(i) : null))
        .filter(Boolean)
        .join(", ")

      cues.push({
        questionIndex: qi,
        kind: m.kind,
        staerke,
        detail: richtigHat
          ? `${where}: Nur ${staerke === "stark" ? "die richtige Option" : "die richtige und eine weitere Option"} enthält ${m.name} (${betroffen || "—"}). Wer rät, wählt genau diese.`
          : `${where}: Die richtige Option ist ${staerke === "stark" ? "die einzige" : "eine von nur zwei Optionen"} OHNE ${m.name}; die übrigen tragen eines (${betroffen}). Das verrät sie.`,
      })
    }

    // Themenecho: Die richtige Antwort nennt das Thema selbst, keine andere
    // tut es. Gemessen: Thema "Ambulant erworbene Pneumonie", richtige Antwort
    // "Ambulant erworbene Pneumonie". Wer das Thema kennt, braucht die Frage nicht.
    if (thema.length >= 6) {
      const enthaelt = (t: string) => {
        const n = normalisiert(t)
        return n.includes(thema) || (n.length >= 6 && thema.includes(n))
      }
      if (enthaelt(richtig) && !distraktoren.some(enthaelt)) {
        cues.push({
          questionIndex: qi,
          kind: "themenecho",
          staerke: "stark",
          detail: `${where}: Die richtige Option nennt das Thema der Frage selbst ("${topic}"), keine andere Option tut das. Das Thema darf nicht die Antwort sein.`,
        })
      }
    }

    // Länge: gemessen an Zeichen, verglichen mit dem Mittel der Distraktoren.
    const mittel = distraktoren.reduce((s, t) => s + t.length, 0) / distraktoren.length
    if (mittel > 0) {
      const verhaeltnis = richtig.length / mittel
      const laengste = distraktoren.every((t) => richtig.length > t.length)
      const kuerzeste = distraktoren.every((t) => richtig.length < t.length)
      const abstand = Math.abs(richtig.length - mittel)
      if (
        abstand >= LAENGE_MIN_ABSTAND &&
        ((verhaeltnis >= LAENGE_OBEN && laengste) || (verhaeltnis <= LAENGE_UNTEN && kuerzeste))
      ) {
        cues.push({
          questionIndex: qi,
          kind: "laenge",
          staerke: "stark",
          detail: `${where}: Die richtige Option ist mit ${richtig.length} Zeichen die ${laengste ? "längste" : "kürzeste"} (Distraktoren im Mittel ${Math.round(mittel)}). Länge verrät die Lösung.`,
        })
      }
    }
  })

  return cues
}

/**
 * Nachbesserungs-Auftrag für gefundene Form-Hinweise. Beschreibt nicht nur
 * den Befund, sondern die Regel, damit die Überarbeitung nicht bloß das eine
 * Wort tauscht und ein neues Signal erzeugt.
 */
export function buildCueRepairHint(cues: OptionCue[]): string {
  if (cues.length === 0) return ""
  return [
    "FORMALE LÖSUNGSHINWEISE IN DEN ANTWORTOPTIONEN — die richtige Antwort ist ohne Fachwissen erkennbar:",
    ...cues.map((c) => `- ${c.detail}`),
    "",
    "Formuliere die Antwortoptionen so um, dass keine Option durch Form auffällt:",
    "- Alle fünf Optionen in derselben grammatischen Form und aus derselben Kategorie.",
    "- KEINE Option trägt eine Begründung oder Zweckangabe (\"zur …\", \"weil …\", \"um … zu\", \"bei vermuteter …\"). Optionen nennen, WAS, nicht WARUM.",
    "- Dringlichkeits-, Absolut- und Pauschalwörter (\"sofortige\", \"ausschließlich\", \"alleinige\", \"dauerhaft\", \"unverändert\", \"ohne weitere\") in keiner Option oder gleich verteilt. Ein Distraktor ist falsch durch seinen INHALT, nicht durch eine übertriebene Formulierung.",
    "- Die richtige Antwort ist nicht die einzige abwägende, bedingte oder mehrschrittige Aussage. Enthält sie eine Bedingung oder einen zweiten Schritt, formuliere die Distraktoren ebenso differenziert.",
    "- Absicherungen (\"unter engmaschiger Kontrolle\", \"nach Ausschluss …\") entweder in keiner Option oder gleich verteilt — nie nur an der richtigen.",
    "- Alle Optionen ähnlich lang; die richtige Antwort ist weder die längste noch die kürzeste.",
    "- Ein Distraktor, der ohne den Stem absurd wirkt, wird durch eine Maßnahme bzw. Aussage ersetzt, die in einer benachbarten Konstellation tatsächlich richtig wäre.",
    "",
    ...(cues.some((c) => c.kind === "themenecho")
      ? [
          "THEMENECHO: Die Frage fragt nach dem Thema selbst. Stelle sie so um, dass sie einen",
          "Aspekt des Themas prüft (Diagnostik, Mechanismus, Komplikation, Therapie, Differenzialdiagnose)",
          "und das Thema nicht als Antwortoption vorkommt. Dafür dürfen Fragestellung und richtige Antwort",
          "sich ändern; Thema und Schwierigkeitsgrad bleiben.",
        ]
      : ["Die AUSSAGE der richtigen Option, ihre Position und die Markierung isCorrect bleiben unverändert."]),
  ].join("\n")
}

/** Verlangt dieser Befund einen Umbau der Frage statt nur neuer Formulierungen? */
export function needsQuestionRework(cues: OptionCue[]): boolean {
  return cues.some((c) => c.kind === "themenecho")
}
