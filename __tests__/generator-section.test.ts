import { describe, it, expect } from "vitest"
import {
  buildDraftUserPrompt,
  buildEnrichUserPrompt,
  buildSystemInstructions,
  buildUserPrompt,
} from "../lib/ai-question-generator-prompt"
import { isGeneratorSection } from "../lib/generator-section"
import { parseGenerateRequest } from "../lib/generator-request"
import { LEARN_PLANS } from "../lib/learn-plans"

const VORKLINISCH = { topic: "Citratzyklus", difficulty: 4, mode: "single" as const, variabilitySeed: 7 }

describe("System-Prompt kennt beide Prüfungsabschnitte", () => {
  const sys = buildSystemInstructions()

  it("erklärt die Unterscheidung Vorklinik/Klinik", () => {
    expect(sys).toMatch(/PRÜFUNGSABSCHNITT/)
    expect(sys).toMatch(/VORKLINISCH sind die Grundlagenfächer/)
    expect(sys).toMatch(/KLINISCH sind Krankheitslehre/)
  })

  it("nennt die vorklinischen Fächer namentlich", () => {
    for (const fach of ["Biochemie", "Physiologie", "Anatomie", "Histologie", "Embryologie"]) {
      expect(sys).toContain(fach)
    }
  })

  it("verbietet die Patientenvignette bei vorklinischen Themen", () => {
    expect(sys).toMatch(/KEINE Patientenvignette/)
    expect(sys).toMatch(/Kein Alter, kein Geschlecht/)
  })

  it("liefert eigene Schwierigkeitsanker für vorklinische Themen", () => {
    expect(sys).toMatch(/KALIBRIERUNG BEI VORKLINISCHEN THEMEN/)
    expect(sys).toMatch(/Physikumsniveau/)
    // Die klinischen Anker bleiben daneben bestehen.
    expect(sys).toMatch(/junger Facharzt|Junger Facharzt/)
  })

  it("behält alle bisherigen Qualitätsregeln", () => {
    expect(sys).toMatch(/QUALITÄTS-MESSLATTE/)
    expect(sys).toMatch(/ERKLÄRUNGS-MANDAT/)
    expect(sys).toMatch(/ANTI-CLICHÉ/)
    expect(sys).toMatch(/VORRANG DER SCHWIERIGKEITSSTUFE/)
  })
})

describe("Auftrag: Abschnitt vorklinik", () => {
  const p = buildDraftUserPrompt({ ...VORKLINISCH, section: "vorklinik" })

  it("gibt den Abschnitt verbindlich vor", () => {
    expect(p).toMatch(/Prüfungsabschnitt: VORKLINIK \(Grundlagenfach\)\. VERBINDLICH\./)
  })

  it("nennt keinen Patient-Archetyp", () => {
    expect(p).not.toMatch(/PATIENT-ARCHETYP/)
    expect(p).toMatch(/KONTEXT-ARCHETYP/)
    expect(p).toMatch(/KEINE Patientengeschichte/)
  })

  it("zieht den Fokus-Winkel aus dem vorklinischen Pool", () => {
    // Klinische Winkel wie Bildgebung oder Akutmanagement dürfen nicht auftauchen.
    expect(p).not.toMatch(/Bildgebungsbefund|Akutmanagement|Leitlinienempfehlung im Kontrast/)
    expect(p).toMatch(/FOKUS-WINKEL/)
  })

  it("verwendet vorklinische Anti-Reflexe ohne Diagnose-/Therapiebezug", () => {
    expect(p).not.toMatch(/Standard-Diagnose oder Standard-Therapie/)
  })
})

describe("Auftrag: Abschnitt klinik", () => {
  const p = buildDraftUserPrompt({
    topic: "Akutes Koronarsyndrom",
    difficulty: 4,
    mode: "single",
    variabilitySeed: 7,
    section: "klinik",
  })

  it("gibt den Abschnitt verbindlich vor", () => {
    expect(p).toMatch(/Prüfungsabschnitt: KLINIK\. VERBINDLICH\./)
  })

  it("behält den Patient-Archetyp bei", () => {
    expect(p).toMatch(/PATIENT-ARCHETYP/)
    expect(p).not.toMatch(/KONTEXT-ARCHETYP/)
  })
})

describe("Auftrag: Abschnitt auto", () => {
  const p = buildDraftUserPrompt({ ...VORKLINISCH, section: "auto" })

  it("lässt das Modell zuordnen", () => {
    expect(p).toMatch(/Prüfungsabschnitt: selbst bestimmen/)
    expect(p).toMatch(/Grundlagenfach .* oder klinisches Fach/s)
  })

  it("stellt beide Archetypen bedingt bereit, statt Klinik zu erzwingen", () => {
    expect(p).toMatch(/Falls das Thema KLINISCH ist — PATIENT-ARCHETYP/)
    expect(p).toMatch(/Falls das Thema VORKLINISCH ist — KONTEXT-ARCHETYP/)
  })

  it("schließt die Patientenvignette für vorklinische Themen aus", () => {
    expect(p).toMatch(/Ein vorklinisches Thema wird NICHT in eine Patientenvignette verpackt/)
  })

  it("ist die Vorgabe, wenn nichts angegeben wurde", () => {
    const ohne = buildDraftUserPrompt(VORKLINISCH)
    expect(ohne).toMatch(/Prüfungsabschnitt: selbst bestimmen/)
  })
})

describe("Abschnitt gilt auch für die Erklärungsstufe", () => {
  it("reicht den Abschnitt in den Anreicherungs-Auftrag durch", () => {
    const p = buildEnrichUserPrompt({
      topic: "Citratzyklus",
      level: 4,
      draftJson: "{}",
      section: "vorklinik",
    })
    expect(p).toMatch(/Prüfungsabschnitt: VORKLINIK/)
  })

  it("fällt ohne Angabe auf selbst bestimmen zurück", () => {
    const p = buildEnrichUserPrompt({ topic: "Citratzyklus", level: 4, draftJson: "{}" })
    expect(p).toMatch(/Prüfungsabschnitt: selbst bestimmen/)
  })
})

describe("Einschritt-Prompt kennt den Abschnitt ebenfalls", () => {
  it("übernimmt die Vorgabe", () => {
    expect(buildUserPrompt({ ...VORKLINISCH, section: "vorklinik" })).toMatch(
      /Prüfungsabschnitt: VORKLINIK/
    )
  })
})

describe("Lernpläne setzen den Abschnitt fest", () => {
  it("ordnet das Physikum der Vorklinik zu", () => {
    expect(LEARN_PLANS.m1.section).toBe("vorklinik")
  })

  it("ordnet den M2-Plan der Klinik zu", () => {
    expect(LEARN_PLANS.m2.section).toBe("klinik")
  })
})

describe("Request-Parser", () => {
  const basis = { topic: "Citratzyklus", difficulty: 4, mode: "single" }

  it("übernimmt einen gültigen Abschnitt", () => {
    const r = parseGenerateRequest({ ...basis, section: "vorklinik" })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.section).toBe("vorklinik")
  })

  it("fällt bei fehlendem Wert auf auto zurück", () => {
    const r = parseGenerateRequest(basis)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.section).toBe("auto")
  })

  it("fällt bei unbekanntem Wert auf auto zurück, statt zu scheitern", () => {
    const r = parseGenerateRequest({ ...basis, section: "quatsch" })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.section).toBe("auto")
  })

  it("reicht den Abschnitt auch bei Fallfragen durch", () => {
    const r = parseGenerateRequest({
      topic: "Glykolyse",
      difficulty: 3,
      mode: "case",
      caseQuestionCount: 3,
      section: "vorklinik",
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.section).toBe("vorklinik")
  })

  it("erkennt gültige Abschnittswerte", () => {
    expect(isGeneratorSection("vorklinik")).toBe(true)
    expect(isGeneratorSection("klinik")).toBe(true)
    expect(isGeneratorSection("auto")).toBe(true)
    expect(isGeneratorSection("physikum")).toBe(false)
    expect(isGeneratorSection(undefined)).toBe(false)
  })
})
