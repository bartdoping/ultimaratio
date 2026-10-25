/**
 * Flow im Kreuz-Strom: Serien, Stufenvorschläge und Runden.
 *
 * Ziel ist der Bereich zwischen Langeweile und Frust. Wer fünfmal in Folge
 * richtig liegt, bekommt eine schwerere Stufe angeboten; wer dreimal in Folge
 * danebenliegt, eine leichtere — angeboten, nie erzwungen. Alle zehn Fragen
 * gibt es einen kurzen Abschluss, damit der endlose Strom Etappen hat.
 */

export const RUNDE = 10
export const SCHWERER_AB = 5
export const LEICHTER_AB = 3

/** Länge der aktuellen Serie: positiv = richtig in Folge, negativ = falsch in Folge. */
export function serie(ergebnisse: boolean[]): number {
  if (ergebnisse.length === 0) return 0
  const letztes = ergebnisse[ergebnisse.length - 1]
  let n = 0
  for (let i = ergebnisse.length - 1; i >= 0 && ergebnisse[i] === letztes; i--) n++
  return letztes ? n : -n
}

/** Meilenstein zum Feiern (3, 5, 10, dann alle 5) — sonst null. */
export function serienMeilenstein(s: number): number | null {
  if (s === 3 || s === 5 || s === 10) return s
  return s > 10 && s % 5 === 0 ? s : null
}

export type StufenVorschlag = { richtung: "schwerer" | "leichter"; stufe: number } | null

/**
 * Stufenvorschlag nach einer Antwort — nur in dem Moment, in dem die Serie
 * die Schwelle erreicht (bzw. ihr Doppeltes), nicht bei jeder weiteren
 * Antwort. `abgelehnt` enthält Stufen, die in dieser Sitzung schon
 * ausgeschlagen wurden — kein Nerven.
 */
export function stufenVorschlag(ergebnisse: boolean[], stufe: number, abgelehnt: ReadonlySet<number>): StufenVorschlag {
  const s = serie(ergebnisse)
  const schwelleSchwer = s === SCHWERER_AB || s === 2 * SCHWERER_AB
  const schwelleLeicht = s === -LEICHTER_AB || s === -2 * LEICHTER_AB
  if (schwelleSchwer && stufe < 5 && !abgelehnt.has(stufe + 1)) return { richtung: "schwerer", stufe: stufe + 1 }
  if (schwelleLeicht && stufe > 1 && !abgelehnt.has(stufe - 1)) return { richtung: "leichter", stufe: stufe - 1 }
  return null
}

/** Ist nach `n` beantworteten Fragen eine Rundenbilanz dran (und noch nicht gezeigt)? */
export function rundeFaellig(n: number, zuletztGezeigtBei: number): boolean {
  return n > 0 && n % RUNDE === 0 && zuletztGezeigtBei < n
}

/** Bilanz der letzten Runde. */
export function rundenBilanz(ergebnisse: boolean[]): { richtig: number; gesamt: number; besteSerie: number } {
  const runde = ergebnisse.slice(-RUNDE)
  let beste = 0
  let lauf = 0
  for (const r of runde) {
    lauf = r ? lauf + 1 : 0
    beste = Math.max(beste, lauf)
  }
  return { richtig: runde.filter(Boolean).length, gesamt: runde.length, besteSerie: beste }
}
