import type { BulkQuestion } from "@/lib/question-bulk-json"

/**
 * Formatiert eine Frage als Klartext zum Weitergeben.
 *
 * Bewusst reiner Text statt eines öffentlichen Links: Ein teilbarer Link
 * müsste gespeicherte Fragen öffentlich abrufbar machen — mit eigenem Token,
 * eigener Route und eigener Datenschutzfolge. Text deckt den tatsächlichen
 * Anwendungsfall (Lerngruppe im Messenger) ohne all das ab.
 *
 * Die Lösung steht am Ende hinter einer Trennlinie, damit sie beim Überfliegen
 * nicht sofort ins Auge fällt.
 */
export function formatQuestionForSharing(
  q: BulkQuestion,
  meta: { topic: string; difficulty: number },
  appUrl?: string
): string {
  const buchstabe = (i: number) => String.fromCharCode(65 + i)
  const richtigIdx = q.options.findIndex((o) => o.isCorrect)

  const teile: string[] = []

  if (q.caseVignette?.trim()) {
    teile.push(q.caseVignette.trim(), "")
  }
  teile.push(q.stem.trim(), "")
  teile.push(...q.options.map((o, i) => `${buchstabe(i)}) ${o.text.trim()}`))
  teile.push("")
  teile.push("—".repeat(24))
  teile.push(
    richtigIdx >= 0
      ? `Lösung: ${buchstabe(richtigIdx)}`
      : "Lösung: nicht eindeutig"
  )
  if (q.keyTakeaway?.trim()) {
    teile.push(q.keyTakeaway.trim())
  }
  teile.push("")
  teile.push(`${meta.topic} · Stufe ${meta.difficulty}/5`)
  if (appUrl) {
    teile.push(`Selbst erzeugt auf ${appUrl}`)
  }

  return teile.join("\n")
}
