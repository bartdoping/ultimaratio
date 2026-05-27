export type BulkQuestionOption = {
  text: string
  isCorrect: boolean
  explanation?: string | null
}

export type BulkQuestion = {
  stem: string
  explanation?: string | null
  allowImmediate: boolean
  caseVignette?: string | null
  images?: { url: string; alt?: string | null }[]
  options: BulkQuestionOption[]
  /** Optionales Lernziel (1 Satz) – wird vom KI-Generator gefüllt. */
  learningObjective?: string | null
  /** Optionale Prüfungsfalle (1 Satz) – wird vom KI-Generator gefüllt. */
  examTrap?: string | null
}

export type BulkQuestionsPayload = {
  questions: BulkQuestion[]
}

export type ValidateBulkJsonResult =
  | { ok: true; payload: BulkQuestionsPayload; questionCount: number; caseCount: number; imageCount: number }
  | { ok: false; error: string }

export function validateBulkJson(raw: string): ValidateBulkJsonResult {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { ok: false, error: "Ungültiges JSON: Syntaxfehler." }
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: 'Ungültiges JSON: Top-Level muss ein Objekt sein.' }
  }
  if (!Array.isArray((data as { questions?: unknown }).questions)) {
    return { ok: false, error: 'Ungültiges JSON: Feld "questions" fehlt oder ist kein Array.' }
  }

  const questions = (data as { questions: unknown[] }).questions
  let caseCount = 0
  let imageCount = 0
  const normalized: BulkQuestion[] = []

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] as Record<string, unknown>
    if (!q || typeof q !== "object") {
      return { ok: false, error: `Ungültige Frage an Position ${i + 1}: muss ein Objekt sein.` }
    }
    if (typeof q.stem !== "string" || !q.stem.trim()) {
      return { ok: false, error: `Ungültige Frage ${i + 1}: "stem" fehlt oder ist leer.` }
    }
    if (typeof q.allowImmediate !== "boolean") {
      return { ok: false, error: `Ungültige Frage ${i + 1}: "allowImmediate" muss boolean sein.` }
    }
    if (q.explanation != null && typeof q.explanation !== "string") {
      return { ok: false, error: `Ungültige Frage ${i + 1}: "explanation" muss string oder null sein.` }
    }
    if (q.caseVignette != null && typeof q.caseVignette !== "string") {
      return { ok: false, error: `Ungültige Frage ${i + 1}: "caseVignette" muss string oder null sein.` }
    }
    if (typeof q.caseVignette === "string" && q.caseVignette.trim()) caseCount += 1

    const options = q.options
    if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
      return { ok: false, error: `Ungültige Frage ${i + 1}: "options" muss ein Array mit 2 bis 6 Elementen sein.` }
    }

    let hasCorrect = false
    const normalizedOptions: BulkQuestionOption[] = []
    for (let j = 0; j < options.length; j++) {
      const o = options[j] as Record<string, unknown>
      if (!o || typeof o !== "object") {
        return { ok: false, error: `Ungültige Frage ${i + 1}: Option ${j + 1} muss ein Objekt sein.` }
      }
      if (typeof o.text !== "string" || !o.text.trim()) {
        return { ok: false, error: `Ungültige Frage ${i + 1}: Option ${j + 1} "text" fehlt oder ist leer.` }
      }
      if (typeof o.isCorrect !== "boolean") {
        return { ok: false, error: `Ungültige Frage ${i + 1}: Option ${j + 1} "isCorrect" muss boolean sein.` }
      }
      if (o.explanation != null && typeof o.explanation !== "string") {
        return { ok: false, error: `Ungültige Frage ${i + 1}: Option ${j + 1} "explanation" muss string oder null sein.` }
      }
      if (o.isCorrect) hasCorrect = true
      normalizedOptions.push({
        text: o.text.trim(),
        isCorrect: o.isCorrect,
        explanation: typeof o.explanation === "string" ? o.explanation : null,
      })
    }
    if (!hasCorrect) {
      return { ok: false, error: `Ungültige Frage ${i + 1}: Mindestens eine Option muss "isCorrect": true haben.` }
    }

    if (q.images != null) {
      if (!Array.isArray(q.images)) {
        return { ok: false, error: `Ungültige Frage ${i + 1}: "images" muss ein Array sein.` }
      }
      for (let k = 0; k < q.images.length; k++) {
        const img = q.images[k] as Record<string, unknown>
        if (!img || typeof img !== "object") {
          return { ok: false, error: `Ungültige Frage ${i + 1}: Bild ${k + 1} muss ein Objekt sein.` }
        }
        if (typeof img.url !== "string" || !/^https?:\/\//.test(img.url)) {
          return { ok: false, error: `Ungültige Frage ${i + 1}: Bild ${k + 1} "url" muss mit http:// oder https:// beginnen.` }
        }
        imageCount += 1
      }
    }

    normalized.push({
      stem: q.stem.trim(),
      explanation: typeof q.explanation === "string" ? q.explanation : null,
      allowImmediate: q.allowImmediate,
      caseVignette: typeof q.caseVignette === "string" ? q.caseVignette : null,
      options: normalizedOptions,
      learningObjective:
        typeof q.learningObjective === "string" ? q.learningObjective.trim() || null : null,
      examTrap:
        typeof q.examTrap === "string" ? q.examTrap.trim() || null : null,
    })
  }

  return {
    ok: true,
    payload: { questions: normalized },
    questionCount: normalized.length,
    caseCount,
    imageCount,
  }
}

export function extractJsonFromModelText(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1].trim()
  const firstBrace = trimmed.indexOf("{")
  const lastBrace = trimmed.lastIndexOf("}")
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }
  return trimmed
}

export function bulkQuestionsToRunnerFormat(questions: BulkQuestion[]) {
  return questions.map((q, qi) => ({
    id: `gen-${qi}`,
    stem: q.stem,
    explanation: q.explanation ?? null,
    caseVignette: q.caseVignette ?? null,
    learningObjective: q.learningObjective ?? null,
    examTrap: q.examTrap ?? null,
    options: q.options.map((o, oi) => ({
      id: `gen-${qi}-opt-${oi}`,
      text: o.text,
      isCorrect: o.isCorrect,
      explanation: o.explanation ?? null,
    })),
  }))
}
