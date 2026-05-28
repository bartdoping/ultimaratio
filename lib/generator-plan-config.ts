/**
 * Reine Konstanten zum Generator-Tarif.
 *
 * Diese Datei darf KEINE Server-Imports enthalten (kein prisma, kein crypto,
 * kein next-auth) – sie wird auch in Client-Komponenten verwendet, um den
 * Bundle nicht mit Server-Code aufzublähen.
 *
 * Die Werte werden von `lib/generator-limits.ts` re-exportiert, damit es
 * weiterhin nur eine Quelle der Wahrheit gibt.
 */

export const GENERATOR_FREE_DAILY_LIMIT = 3
export const GENERATOR_PRO_DAILY_LIMIT = 100
