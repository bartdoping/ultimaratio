/**
 * Zentrale Schwierigkeits-Labels. Wird im Generator-Formular, im Runner
 * und im Difficulty-Badge verwendet.
 */
export function difficultyLabel(level: number): string {
  switch (Math.round(level)) {
    case 1:
      return "Basiswissen"
    case 2:
      return "Leicht"
    case 3:
      return "Examensniveau"
    case 4:
      return "Schwer · klinisches Denken"
    case 5:
      return "Sehr schwer · Differential"
    default:
      return "Examensniveau"
  }
}

export function difficultyTone(level: number): "muted" | "emerald" | "amber" | "rose" {
  const n = Math.round(level)
  if (n <= 2) return "emerald"
  if (n === 3) return "muted"
  if (n === 4) return "amber"
  return "rose"
}
