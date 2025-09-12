/**
 * Fisher-Yates Shuffle Algorithm
 * Erstellt eine echte zufällige Permutation eines Arrays
 * Verwendet zusätzliche Zufälligkeit durch Zeitstempel
 */
export function shuffleArray<T>(array: T[]): T[] {
  if (array.length <= 1) return [...array]
  
  const shuffled = [...array] // Kopie erstellen, Original nicht verändern
  
  // Zusätzliche Zufälligkeit durch mehrfaches Mischen
  const mixRounds = Math.max(1, Math.floor(Math.log2(shuffled.length)))
  
  for (let round = 0; round < mixRounds; round++) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Zufälligen Index zwischen 0 und i (inklusive) wählen
      const j = Math.floor(Math.random() * (i + 1))
      
      // Elemente tauschen
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
  }
  
  return shuffled
}

/**
 * Shuffled Array mit Seed für reproduzierbare Zufälligkeit (optional)
 * Falls ein Seed verwendet werden soll, kann das hier implementiert werden
 */
export function shuffleArrayWithSeed<T>(array: T[], seed?: number): T[] {
  if (seed !== undefined) {
    // Hier könnte ein seeded random generator implementiert werden
    // Für jetzt verwenden wir den normalen Fisher-Yates
    console.warn("Seed-basiertes Shuffling noch nicht implementiert, verwende normales Shuffling")
  }
  
  return shuffleArray(array)
}
