/**
 * Spoiler-Detection für Fallfragen.
 *
 * Idee: Wenn in einer Fallvignette mit mehreren Teilfragen die korrekte
 * Antwort von Q[i+1..] (oder ihre Erklärung) in Stem/Erklärungen von Q[<= i]
 * auftaucht, ist das ein Spoiler — die Lösung späterer Fragen ist dann schon
 * sichtbar, bevor sie gestellt werden.
 *
 * Bag-of-Words-Lookahead. Bewusst konservativ:
 * - Stoppwörter (DE + medizinisch generisch) werden ignoriert,
 * - sehr kurze Wörter (< 6 Zeichen) und reine Zahlen werden ignoriert,
 * - Mindestens 1 Treffer in `min stem of later` ist nötig.
 *
 * Kein NLP, keine externen Dependencies. False-Positives möglich — daher
 * triggern wir nur einen einzigen Repair-Pass und akzeptieren das Ergebnis
 * danach.
 */
import type { BulkQuestion, BulkQuestionOption } from "@/lib/question-bulk-json"

const MIN_WORD_LEN = 6
const NUMERIC = /^[\d.,/+\-x×*]+$/

// Deutsche + medizinisch generische Stoppwörter, kleingeschrieben.
const STOPWORDS = new Set([
  // Artikel/Pronomen/Konjunktionen
  "aber", "alle", "allen", "aller", "alles", "also", "andere", "anderen", "andern",
  "anders", "auch", "aufgrund", "ausser", "außer", "beim", "bevor", "beziehungsweise",
  "bzgl", "bzw", "damit", "danach", "dann", "darauf", "darum", "dass", "daher", "denen",
  "denn", "der", "des", "deren", "dessen", "deshalb", "diese", "diesen", "dieser",
  "dieses", "doch", "drei", "durch", "ebenso", "eine", "einem", "einen", "einer",
  "eines", "einige", "einigen", "einiger", "einiges", "etwa", "etwas", "fall", "falls",
  "für", "gegen", "geht", "gibt", "haben", "hatte", "hatten", "hier", "ihre", "ihrem",
  "ihren", "ihrer", "ihres", "immer", "indem", "insgesamt", "jeder", "jedem", "jedes",
  "jene", "jenen", "jener", "jenes", "kann", "kein", "keine", "keinen", "keiner",
  "keines", "können", "konnte", "konnten", "letzte", "letzten", "letzter", "letztere",
  "machen", "macht", "mehr", "meine", "meinem", "meinen", "meiner", "meines", "mittels",
  "muss", "müssen", "musste", "mussten", "nach", "nicht", "noch", "nochmal", "nur",
  "oben", "oder", "oft", "ohne", "schon", "sehr", "seien", "seine", "seinem", "seinen",
  "seiner", "seines", "selbst", "sich", "sind", "sodass", "sofort", "solche", "solchen",
  "solcher", "solches", "sollte", "sollten", "somit", "sondern", "sonst", "sowie",
  "später", "trotz", "über", "uns", "unsere", "unserem", "unseren", "unserer", "unseres",
  "unten", "viel", "viele", "vielen", "vieler", "vieles", "vom", "voll", "von",
  "vor", "vorher", "wann", "war", "waren", "warum", "was", "weil", "welche", "welchen",
  "welcher", "welches", "wenn", "wer", "werde", "werden", "wessen", "wie", "wieder",
  "wieso", "will", "wir", "wird", "wirst", "wo", "wobei", "wodurch", "wofür", "wohin",
  "woraus", "wovon", "wozu", "wurde", "wurden", "während", "zum", "zur", "zwar",
  "zwischen", "zwei",
  // Englische Reste
  "and", "are", "the", "you", "your", "this", "that", "with", "have",
  // Medizinisch / kontextuell zu generisch
  "ablauf", "abläufe", "antwort", "antworten", "anwendung", "anzeichen",
  "ärztliche", "ärztlich", "begründung", "begründungen", "beobachtung",
  "beobachtungen", "darstellung", "differenzialdiagnostisch",
  "differenzialdiagnostische", "differenzialdiagnostischen",
  "differenzialdiagnostischer", "differenzialdiagnostisches",
  "differentialdiagnostisch", "erwägung", "erwägungen", "hinweis",
  "hinweise", "hinweisen", "option", "optionen", "verschieden",
  "verschiedene", "verschiedenen", "verschiedener", "verschiedenes",
  "wahrscheinlich", "wahrscheinliche", "wahrscheinlichen", "wahrscheinlicher",
  "wahrscheinliches", "möglich", "mögliche", "möglichen", "möglicher",
  "möglicherweise", "möglichkeit", "möglichkeiten", "wichtig", "wichtige",
  "wichtigen", "wichtiger", "wichtiges",
  "befund", "behandlung", "befunde", "beispiele", "beispiel", "diagnose",
  "diagnosen", "diagnostik", "differenzialdiagnose", "differentialdiagnose",
  "erkrankung", "erkrankungen", "frage", "fragen", "klinik", "klinisch",
  "klinische", "klinischen", "klinischer", "klinisches", "labor", "laborwert",
  "laborwerten", "medikament", "medikamente", "medizinisch", "medizinische",
  "medizinischen", "patient", "patienten", "patientin", "patientinnen",
  "praxis", "primär", "primäre", "primären", "richtig", "richtige", "richtigen",
  "richtiges", "stadium", "symptom", "symptome", "symptomatik", "syndrom",
  "syndrome", "therapie", "therapien", "therapeutisch", "therapeutische",
  "untersuchung", "untersuchungen", "ursache", "ursachen", "verfahren",
  "verlauf", "vorgehen", "vorgehensweise", "weitere", "weiteren", "weiterer",
  "weiteres", "wirkung", "wirkungen",
])

/** Tokens extrahieren: kleingeschrieben, nur „Wort"-Charaktere (mit Umlauten). */
function tokenize(text: string): string[] {
  if (!text) return []
  return text
    .toLowerCase()
    .split(/[^a-z0-9äöüß-]+/i)
    .filter(Boolean)
}

/** Inhaltswort? */
function isContentWord(word: string): boolean {
  if (word.length < MIN_WORD_LEN) return false
  if (NUMERIC.test(word)) return false
  if (STOPWORDS.has(word)) return false
  return true
}

function correctOption(q: BulkQuestion): BulkQuestionOption | undefined {
  return q.options.find((o) => o.isCorrect)
}

/** Schlüsselwörter aus dem „Lösungs-Footprint" einer Frage. */
function keywordsForFutureQuestion(q: BulkQuestion): Set<string> {
  const correct = correctOption(q)
  const buckets: string[] = []
  if (correct) {
    buckets.push(correct.text)
    if (correct.explanation) buckets.push(correct.explanation)
  }
  if (q.explanation) buckets.push(q.explanation)
  if (q.learningObjective) buckets.push(q.learningObjective)
  if (q.examTrap) buckets.push(q.examTrap)

  const result = new Set<string>()
  for (const text of buckets) {
    for (const tok of tokenize(text)) {
      if (isContentWord(tok)) result.add(tok)
    }
  }
  return result
}

/** Worte aus den „Sichtbaren" Texten einer früheren Frage. */
function earlierVisibleTokens(q: BulkQuestion): Set<string> {
  const buckets: string[] = []
  buckets.push(q.stem)
  if (q.explanation) buckets.push(q.explanation)
  for (const opt of q.options) {
    if (opt.explanation) buckets.push(opt.explanation)
    buckets.push(opt.text)
  }
  if (q.examTrap) buckets.push(q.examTrap)
  if (q.learningObjective) buckets.push(q.learningObjective)

  const result = new Set<string>()
  for (const text of buckets) {
    for (const tok of tokenize(text)) {
      if (isContentWord(tok)) result.add(tok)
    }
  }
  return result
}

export type SpoilerHit = {
  earlierQuestion: number // 1-based
  laterQuestion: number // 1-based
  terms: string[]
}

/**
 * Untersucht eine Fallfrage auf Spoiler. Gibt eine Liste der gefundenen
 * Treffer zurück (leer = sauber).
 */
export function detectSpoilers(questions: BulkQuestion[]): SpoilerHit[] {
  if (questions.length < 2) return []

  const hits: SpoilerHit[] = []
  for (let later = 1; later < questions.length; later++) {
    const future = keywordsForFutureQuestion(questions[later])
    if (future.size === 0) continue
    for (let earlier = 0; earlier < later; earlier++) {
      const visible = earlierVisibleTokens(questions[earlier])
      const shared: string[] = []
      for (const term of future) {
        if (visible.has(term)) shared.push(term)
      }
      if (shared.length > 0) {
        hits.push({
          earlierQuestion: earlier + 1,
          laterQuestion: later + 1,
          terms: shared.slice(0, 6),
        })
      }
    }
  }
  return hits
}

/** Kompakter Hint-String für einen Repair-Pass-Prompt. */
export function buildSpoilerRepairHint(hits: SpoilerHit[]): string {
  if (hits.length === 0) return ""
  const lines = hits.map(
    (h) =>
      `- Frage ${h.earlierQuestion} darf die Lösung von Frage ${h.laterQuestion} nicht vorwegnehmen. Auffällige Begriffe: ${h.terms.join(", ")}.`
  )
  return [
    "SPOILER-VERSTOSS in Fallfrage erkannt. Korrigiere die folgenden Stellen, ohne fachliche Qualität zu verlieren:",
    ...lines,
    "Entferne oder umformuliere in den genannten früheren Fragen alle Begriffe, die die spätere Lösung verraten. Bewahre die Lernziele und Antworten der späteren Fragen unverändert. Antworte ausschließlich mit gültigem JSON nach demselben Schema.",
  ].join("\n")
}
