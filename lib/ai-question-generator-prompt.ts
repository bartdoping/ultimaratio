/** Medizinische Kernregeln – inhaltlich vollständig, ohne JSON-Duplikate. */
const MEDICAL_CORE_RULES = `Rolle und Ziel
Du bist anerkannter Medizinexperte und Professor mit jahrzehntelanger Lehre. Als Mitglied des Gremiums zur Erstellung von Prüfungsfragen für Physikum und Hammerexamen Humanmedizin (M1/1. Staatsexamen, M2/2. Staatsexamen) erstellst du anspruchsvolle Single-Choice-Fragen (jeweils 5 Antwortoptionen). Du kennst Merkhilfen, Eselsbrücken und Mnemonics und bist besonders stark in der Strategie „Kreuzen“.

Anforderungen
• Hochwertige, anspruchsvolle Single-Choice-Fragen mit erheblichem Wissenszuwachs.
• Fallfragen (2–5 Teilfragen): gemeinsamer Fall, alle Teilfragen zusammen generieren, nicht abbrechen; keine gegenseitigen Spoiler; jede Teilfrage eigenständig.
• Genau eine finale Antwort bzw. ein finaler Fallblock – keine Alternativ-Varianten.
• Schwierigkeitsgrad 1–5: 1=sehr leicht, 2=leicht, 3=Examensniveau, 4=schwer, 5=sehr schwer.
• Examensniveau, Mechanismen, klinische Bezüge, typische Prüfungsfallen; variierte Fragetypen.
• Antwortoptionen klar unterscheidbar; korrekte Antwort zufällig verteilt (kein B/C-Muster).
• Keine Verwendung von „IMPP“, „FDA“ oder anderen Organisationen. Keine Halluzinationen.`

export type GeneratorRequestParams = {
  topic: string
  difficulty: number
  mode: "single" | "case"
  caseQuestionCount?: number
}

function userParamsBlock(params: GeneratorRequestParams): string {
  const { topic, difficulty, mode, caseQuestionCount } = params
  const modeLine =
    mode === "single"
      ? "Modus: Einzelfrage (genau 1 Element in questions)."
      : `Modus: Fallfrage mit genau ${caseQuestionCount} Teilfragen (genau ${caseQuestionCount} Elemente in questions, identischer caseVignette).`

  return [
    "[NUTZER-VORGABEN]",
    `Thema/Inhalt: ${topic}`,
    `Schwierigkeitsgrad: ${difficulty} von 5`,
    modeLine,
    "[/NUTZER-VORGABEN]",
  ].join("\n")
}

const PLAYABLE_JSON_RULES = `TECHNISCHES AUSGABEFORMAT (verbindlich):
Antworte ausschließlich mit gültigem JSON ohne Markdown und ohne zusätzlichen Text.
Schema:
{
  "questions": [
    {
      "stem": "string",
      "explanation": null,
      "allowImmediate": true,
      "caseVignette": "string oder null",
      "options": [
        { "text": "string", "isCorrect": boolean, "explanation": null }
      ]
    }
  ]
}
Jede Frage: exakt 5 Optionen, genau eine mit isCorrect true. allowImmediate immer true.
explanation und options[].explanation sind in dieser Phase immer null.
Einzelfrage: 1 Element, caseVignette null. Fallfrage: geforderte Anzahl, gleicher nicht-leerer caseVignette.`

/** Phase 1: Schnell spielbare Frage(n) – Stem, Optionen, Falltext – ohne Erklärungen. */
export function buildPlayableQuestionPrompt(params: GeneratorRequestParams): string {
  return [
    MEDICAL_CORE_RULES,
    "",
    "Erzeuge jetzt die spielbare Prüfungsfrage (Stem + 5 Optionen mit isCorrect). Erklärungen werden später nachgeladen – setze explanation überall auf null.",
    "",
    userParamsBlock(params),
    "",
    PLAYABLE_JSON_RULES,
    "",
    "Generiere jetzt das JSON:",
  ].join("\n")
}

const EXPLANATION_JSON_RULES = `TECHNISCHES AUSGABEFORMAT (verbindlich):
Antworte ausschließlich mit gültigem JSON ohne Markdown.
Gleiche Anzahl und Reihenfolge wie die Eingabe-Fragen.
Schema:
{
  "questions": [
    {
      "stem": "(unverändert aus Eingabe)",
      "explanation": "prägnante Gesamterklärung als Fließtext, keine Stichpunkte",
      "allowImmediate": true,
      "caseVignette": "(unverändert)",
      "options": [
        { "text": "(unverändert)", "isCorrect": (unverändert), "explanation": "knapp: warum richtig/falsch" }
      ]
    }
  ]
}
Zu jeder Option eine prägnante prüfungsorientierte Erklärung. Gesamterklärung als Fließtext.
Wenn sinnvoll: Merkhilfen/Eselsbrücken in Erklärungen einbauen. Oberarzt-Tipp ohne Lösungs-Spoiler.`

/** Phase 2: Didaktische Erklärungen zu bereits generierten Fragen. */
export function buildExplanationPrompt(
  params: GeneratorRequestParams,
  questionsJson: string
): string {
  return [
    MEDICAL_CORE_RULES,
    "",
    "Erstelle didaktisch hochwertige Erklärungen zu den folgenden bereits fertigen Prüfungsfragen.",
    "Ändere stem, option text, isCorrect und caseVignette nicht.",
    "",
    userParamsBlock(params),
    "",
    "[EINGABE-FRAGEN]",
    questionsJson,
    "[/EINGABE-FRAGEN]",
    "",
    EXPLANATION_JSON_RULES,
    "",
    "Generiere jetzt das JSON mit Erklärungen:",
  ].join("\n")
}

/** @deprecated Vollständiger Ein-Schuss-Prompt – nur Fallback. */
export function buildQuestionGeneratorPrompt(params: GeneratorRequestParams): string {
  return buildPlayableQuestionPrompt(params).replace(
    "explanation und options[].explanation sind in dieser Phase immer null.",
    "Füge zu jeder Option und pro Frage eine knappe prüfungsorientierte Erklärung hinzu (explanation nicht null)."
  )
}
