/**
 * Markierungslogik für Fragentexte.
 *
 * Markierungen werden als Menge von ZEICHEN-Indizes geführt, nicht als
 * Wortindizes. Nur so lässt sich eine beliebige Passage markieren — ein
 * einzelnes Zeichen ebenso wie mehrere Wörter am Stück. Beim Rendern werden
 * zusammenhängende Indizes wieder zu durchgehenden Blöcken verschmolzen.
 *
 * Bewusst frei von DOM-Zugriffen, damit die Logik ohne Browser prüfbar ist.
 */

export type HighlightSet = Set<number>

export type HighlightRun = { start: number; end: number; on: boolean }

/**
 * Fasst gleichartige Nachbarzeichen zu Blöcken zusammen. Aus einer Menge
 * einzelner Indizes wird so die Blockstruktur für die Darstellung.
 */
export function buildRuns(text: string, active: HighlightSet): HighlightRun[] {
  const runs: HighlightRun[] = []
  let i = 0
  while (i < text.length) {
    const on = active.has(i)
    let j = i + 1
    while (j < text.length && active.has(j) === on) j += 1
    runs.push({ start: i, end: j, on })
    i = j
  }
  return runs
}

/**
 * Grenzt eine Auswahl auf sichtbaren Text ein.
 *
 * Wer über eine Passage zieht, erwischt fast immer ein Leerzeichen am Rand.
 * Ohne Beschnitt entstünden gelbe Fransen vor und hinter der Markierung.
 */
export function trimRange(text: string, start: number, end: number): [number, number] {
  let a = Math.max(0, Math.min(start, text.length))
  let b = Math.max(0, Math.min(end, text.length))
  while (a < b && /\s/.test(text[a])) a += 1
  while (b > a && /\s/.test(text[b - 1])) b -= 1
  return [a, b]
}

/**
 * Wendet eine gezogene Auswahl an.
 *
 * Ist die Passage bereits VOLLSTÄNDIG markiert, wird sie entfernt, sonst
 * markiert. Dieselbe Geste dient damit beidem. Ein nur teilweise markierter
 * Bereich gilt als "markieren" — so lässt sich eine bestehende Markierung
 * nach außen erweitern, statt sie versehentlich zu löschen.
 */
export function applyRange(
  text: string,
  active: HighlightSet,
  rawStart: number,
  rawEnd: number
): HighlightSet {
  const [start, end] = trimRange(text, rawStart, rawEnd)
  if (end <= start) return active

  let allOn = true
  for (let i = start; i < end; i += 1) {
    if (!active.has(i)) {
      allOn = false
      break
    }
  }

  const next = new Set(active)
  for (let i = start; i < end; i += 1) {
    if (allOn) next.delete(i)
    else next.add(i)
  }
  return next
}

/**
 * Entfernt den zusammenhängenden Markierungsblock an einer Position.
 *
 * Das ist die Geste für einen einfachen Klick auf eine Markierung: Man muss
 * nicht exakt über die alte Stelle ziehen, um sie wieder loszuwerden.
 */
export function removeRunAt(
  text: string,
  active: HighlightSet,
  pos: number
): HighlightSet {
  if (!active.has(pos)) return active
  const next = new Set(active)
  for (let i = pos; i >= 0 && next.has(i); i -= 1) next.delete(i)
  for (let i = pos + 1; i < text.length && next.has(i); i += 1) next.delete(i)
  return next
}
