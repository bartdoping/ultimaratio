/**
 * Blindtest: Errät ein Ratestratege die Lösung, ohne die Frage zu sehen?
 *
 * Bei fünf gleichwertigen Optionen liegt die Zufallsquote bei 20 %. Liegt die
 * Trefferquote deutlich darüber, verraten die Optionen die Lösung. Ziel:
 * unter 30 %. Gemessen wird auf einem FESTEN Fragensatz, damit Prompt-
 * Änderungen vergleichbar bleiben.
 */

export const BLINDTEST_ZIEL = 0.3

/** Tipp des Prüfers (unabhängig von seiner Sicherheit) als Originalindex. */
export function blindTipp(raw: string, zuordnung: number[]): number | null {
  try {
    const start = raw.indexOf("{")
    const ende = raw.lastIndexOf("}")
    const d = JSON.parse(start >= 0 && ende > start ? raw.slice(start, ende + 1) : raw) as {
      tipp?: { nr?: unknown }
      verdaechtig?: { nr?: unknown }
    }
    const n = Number(d.tipp?.nr ?? d.verdaechtig?.nr)
    if (!Number.isInteger(n) || n < 1 || n > zuordnung.length) return null
    return zuordnung[n - 1]
  } catch {
    return null
  }
}

export type BlindErgebnis = { difficulty: number; getroffen: boolean }

export function blindAuswertung(e: BlindErgebnis[]): {
  gesamt: { n: number; quote: number | null }
  jeStufe: { difficulty: number; n: number; quote: number }[]
  bestanden: boolean | null
} {
  const quote = (xs: BlindErgebnis[]) => (xs.length ? xs.filter((x) => x.getroffen).length / xs.length : null)
  const stufen = [...new Set(e.map((x) => x.difficulty))].sort((a, b) => a - b)
  const gesamt = quote(e)
  return {
    gesamt: { n: e.length, quote: gesamt },
    jeStufe: stufen.map((d) => {
      const xs = e.filter((x) => x.difficulty === d)
      return { difficulty: d, n: xs.length, quote: quote(xs) ?? 0 }
    }),
    bestanden: gesamt === null ? null : gesamt < BLINDTEST_ZIEL,
  }
}
