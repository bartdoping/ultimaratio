import { describe, expect, it } from "vitest"
import { bestimmeDisziplin } from "@/lib/disziplin"
import { buildDraftUserPrompt, buildUserPrompt } from "@/lib/ai-question-generator-prompt"

describe("bestimmeDisziplin", () => {
  it("erkennt makroskopische Anatomie aus dem Lernplan", () => {
    for (const t of ["Unterarm", "Hand", "Leitungsbahnen der oberen Extremität", "Schulter und Schultergürtel", "Hirnnerven", "Wirbelsäule"]) {
      expect(bestimmeDisziplin(t, "vorklinik")).toBe("anatomie")
    }
  })
  it("trennt die übrigen Grundlagenfächer", () => {
    expect(bestimmeDisziplin("Citratzyklus", "vorklinik")).toBe("biochemie")
    expect(bestimmeDisziplin("Atmungskette", "vorklinik")).toBe("biochemie")
    expect(bestimmeDisziplin("Ruhe- und Aktionspotential", "vorklinik")).toBe("physiologie")
    expect(bestimmeDisziplin("Knorpelgewebe", "vorklinik")).toBe("histologie")
    expect(bestimmeDisziplin("Embryonalentwicklung", "vorklinik")).toBe("embryologie")
    expect(bestimmeDisziplin("Stressmodelle", "vorklinik")).toBe("psychsoz")
    expect(bestimmeDisziplin("Ionisierende Strahlung", "vorklinik")).toBe("naturwiss")
  })
  it("freie Eingaben über Schlüsselwörter", () => {
    expect(bestimmeDisziplin("Plexus brachialis", "auto")).toBe("anatomie")
    expect(bestimmeDisziplin("Glykolyse in Erythrozyten", "auto")).toBe("biochemie")
  })
  it("Klinik: Querschnittsfächer getrennt von Krankheitsbildern", () => {
    expect(bestimmeDisziplin("Akutes Koronarsyndrom", "klinik")).toBe("klinik")
    expect(bestimmeDisziplin("Epidemiologie", "klinik")).toBe("klinik_quer")
    expect(bestimmeDisziplin("Leichenschau", "klinik")).toBe("klinik_quer")
  })
  it("Unklares (z. B. ein Organ) fällt auf den ausgewogenen Mischtopf", () => {
    expect(bestimmeDisziplin("Magen", "vorklinik")).toBe("allgemein")
  })
})

// Begriffe, die nur in Biochemie-/Physiologie-Vorgaben vorkommen.
const FACHFREMD_FUER_ANATOMIE = /In-vitro|isoliertem Organ|allosterisch|Enzym|Stoffwechsel|Stöchiometrie|Kompartiment|Km, Vmax|Hypoxie|Konzentration, Potential|Rezeptor- oder Kanaltypen/

describe("Auftrag für ein Anatomiethema (Fehlerbild: Sarkomer-Frage zu 'Unterarm')", () => {
  it("enthält über alle Stufen und Zufallswerte nur anatomische Vorgaben", () => {
    for (let level = 1; level <= 5; level++) {
      for (let seed = 0; seed < 60; seed++) {
        const p = buildDraftUserPrompt({ topic: "Unterarm", difficulty: level, mode: "single", section: "vorklinik", variabilitySeed: seed })
        const vorgaben = p.slice(p.indexOf("VARIABILITÄTS-VORGABEN"), p.indexOf("Selbst-Check"))
        expect(vorgaben).not.toMatch(FACHFREMD_FUER_ANATOMIE)
      }
    }
  })
  it("nennt das Fach verbindlich", () => {
    const p = buildUserPrompt({ topic: "Unterarm", difficulty: 3, mode: "single", section: "vorklinik", variabilitySeed: 1 })
    expect(p).toMatch(/Fach \(aus dem Thema abgeleitet\): Makroskopische Anatomie\. VERBINDLICH/)
  })
})

describe("Auftrag für andere Fächer", () => {
  it("Psychologie bekommt keine Biochemie-/Physiologie-Vorgaben", () => {
    for (let seed = 0; seed < 40; seed++) {
      const p = buildDraftUserPrompt({ topic: "Lernen, Kognition und Entwicklung", difficulty: 3, mode: "single", section: "vorklinik", variabilitySeed: seed })
      const vorgaben = p.slice(p.indexOf("VARIABILITÄTS-VORGABEN"), p.indexOf("Selbst-Check"))
      expect(vorgaben).not.toMatch(/Enzym|Stoffwechsel|Potential|Gewebe|Präparat/)
    }
  })
  it("Epidemiologie bekommt keinen Patienten-Archetyp", () => {
    for (let seed = 0; seed < 40; seed++) {
      const p = buildDraftUserPrompt({ topic: "Epidemiologie", difficulty: 4, mode: "single", section: "klinik", variabilitySeed: seed })
      expect(p).not.toMatch(/PATIENT-ARCHETYP/)
    }
  })
  it("Klinische Krankheitsbilder behalten den Patienten-Archetyp", () => {
    const p = buildDraftUserPrompt({ topic: "Akutes Koronarsyndrom", difficulty: 4, mode: "single", section: "klinik", variabilitySeed: 7 })
    expect(p).toMatch(/PATIENT-ARCHETYP/)
    expect(p).not.toMatch(/Fach \(aus dem Thema abgeleitet\)/)
  })
})
