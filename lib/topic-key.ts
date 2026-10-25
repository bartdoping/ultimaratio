/**
 * Normalisiertes Thema für Vergleiche: Kleinschreibung, ohne Satzzeichen.
 * Frei von Server-Imports — wird auch im Browser gebraucht.
 */
export function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}
