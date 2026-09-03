import type { GeneratorSection } from "@/lib/generator-section"

/**
 * Zentrale Schwierigkeits-Labels. Wird im Generator-Formular, im Runner
 * und im Difficulty-Badge verwendet.
 *
 * Die Bezeichnungen folgen bewusst WÖRTLICH den Kalibrierungsankern des
 * Generator-Prompts ("WER kann das beantworten?"). Frühere Labels wie
 * "Sehr schwer · Differential" für Stufe 5 beschrieben etwas anderes als das,
 * was tatsächlich erzeugt wird (Subspezialistenwissen und Curiosa) — und
 * "klinisches Denken" auf Stufe 4 ist bei einer vorklinischen Frage
 * schlicht falsch. Wer die Stufe wählt, muss wissen, was er bekommt.
 */

const KLINIK_LABELS: Record<number, string> = {
  1: "Allgemeinwissen",
  2: "Grundlagen",
  3: "Examensniveau",
  4: "Junger Facharzt",
  5: "Subspezialist",
}

const VORKLINIK_LABELS: Record<number, string> = {
  1: "Allgemeinwissen",
  2: "Grundlagen",
  3: "Physikumsniveau",
  4: "Fortgeschritten",
  5: "Spezialwissen",
}

export function difficultyLabel(level: number, section?: GeneratorSection): string {
  const lvl = Math.round(level)
  const table = section === "vorklinik" ? VORKLINIK_LABELS : KLINIK_LABELS
  return table[lvl] ?? table[3]
}

/**
 * Ausführliche Beschreibung für Tooltips und das Auswahlformular: Sie benennt
 * die Zielgruppe der Stufe, damit die Wahl nicht geraten werden muss.
 */
const KLINIK_HINTS: Record<number, string> = {
  1: "Ein medizinisch interessierter Laie kann das beantworten.",
  2: "Grundlagenwissen der ersten vier Semester.",
  3: "Was ein gut vorbereiteter Examenskandidat können sollte — etwa die Hälfte löst es.",
  4: "Detailwissen aktueller Leitlinien; ein fachfremder Hausarzt wäre unsicher.",
  5: "Wissen abseits der Lehrbücher — Curiosa, Studienzahlen, Eponyme. Kaum jemand löst das ohne Spezialisierung.",
}

const VORKLINIK_HINTS: Record<number, string> = {
  1: "Ein medizinisch interessierter Laie kann das beantworten.",
  2: "Grundbegriffe und einfache Zuordnungen.",
  3: "Was ein gut vorbereiteter Physikumskandidat beherrschen muss.",
  4: "Detailwissen jenseits des Prüfungskanons — Regulation, exakte Werte, Sonderfälle.",
  5: "Spezialwissen der Grundlagenfächer: Originalliteratur, Entdeckungsgeschichte, exotische Isoformen.",
}

export function difficultyHintShort(level: number, section?: GeneratorSection): string {
  const lvl = Math.round(level)
  const table = section === "vorklinik" ? VORKLINIK_HINTS : KLINIK_HINTS
  return table[lvl] ?? table[3]
}

export function difficultyTone(level: number): "muted" | "emerald" | "amber" | "rose" {
  const n = Math.round(level)
  if (n <= 2) return "emerald"
  if (n === 3) return "muted"
  if (n === 4) return "amber"
  return "rose"
}
