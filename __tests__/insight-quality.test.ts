import { describe, it, expect } from "vitest"
import {
  isMnemonicWorthShowing,
  isMustKnowWorthShowing,
} from "../lib/insight-quality"

describe("isMustKnowWorthShowing", () => {
  it("lehnt leeren / null Wert ab", () => {
    expect(isMustKnowWorthShowing(null)).toBe(false)
    expect(isMustKnowWorthShowing(undefined)).toBe(false)
    expect(isMustKnowWorthShowing("")).toBe(false)
    expect(isMustKnowWorthShowing("   ")).toBe(false)
  })

  it("lehnt zu kurze Texte ab", () => {
    expect(isMustKnowWorthShowing("Kurz.")).toBe(false)
    expect(isMustKnowWorthShowing("Diabetes wichtig.")).toBe(false)
  })

  it("lehnt Floskeln ab", () => {
    expect(isMustKnowWorthShowing("Verständnis von Schlaganfallpathophysiologie und Therapie.")).toBe(false)
    expect(isMustKnowWorthShowing("Verstehen, wie Diabetes mellitus typischerweise entsteht.")).toBe(false)
    expect(isMustKnowWorthShowing("Einführung in die Schlaganfall-Akuttherapie und ihre Cut-Offs.")).toBe(false)
    expect(isMustKnowWorthShowing("Merke: das ist wichtig zu wissen für die Prüfung.")).toBe(false)
  })

  it("akzeptiert konkrete Must-Knows mit Substanz", () => {
    expect(
      isMustKnowWorthShowing(
        "Bei NSTE-ACS bestimmt die GRACE-Risikostratifizierung das Zeitfenster der invasiven Diagnostik."
      )
    ).toBe(true)
    expect(
      isMustKnowWorthShowing(
        "rtPA ist beim ischämischen Schlaganfall im 4,5-h-Zeitfenster indiziert, sofern INR < 1,7 vorliegt."
      )
    ).toBe(true)
  })
})

describe("isMnemonicWorthShowing", () => {
  it("lehnt leere/null Werte ab", () => {
    expect(isMnemonicWorthShowing(null)).toBe(false)
    expect(isMnemonicWorthShowing(undefined)).toBe(false)
    expect(isMnemonicWorthShowing("")).toBe(false)
  })

  it("lehnt zu kurze Texte ab", () => {
    expect(isMnemonicWorthShowing("kurze hilfe")).toBe(false)
  })

  it("lehnt schwache Floskel-Eselsbrücken ab", () => {
    expect(isMnemonicWorthShowing("Merke: ASS macht Magen-Probleme.")).toBe(false)
    expect(isMnemonicWorthShowing("Denke an die Risikofaktoren bei jedem Patienten.")).toBe(false)
    expect(isMnemonicWorthShowing("Nicht vergessen: rechtzeitig behandeln.")).toBe(false)
  })

  it("akzeptiert etablierte Akronyme/Schemata", () => {
    expect(
      isMnemonicWorthShowing(
        "FAST-Schema beim Schlaganfall: Face Arms Speech Time."
      )
    ).toBe(true)
    expect(
      isMnemonicWorthShowing(
        "ABCDE-Schema beim Polytrauma: Airway, Breathing, Circulation, Disability, Exposure."
      )
    ).toBe(true)
    expect(
      isMnemonicWorthShowing(
        "CHA2DS2-VASc zur Risikostratifizierung beim Vorhofflimmern."
      )
    ).toBe(true)
    expect(isMnemonicWorthShowing("qSOFA-Kriterien zur Sepsis-Screening.")).toBe(true)
  })

  it("akzeptiert eigene Akronyme (≥3 Großbuchstaben)", () => {
    expect(
      isMnemonicWorthShowing(
        "Merkspruch SCHLAG: Sprache, Cerebellum, Hemiparese, Lähmung, Aphasie, Gefühl."
      )
    ).toBe(true)
  })

  it("akzeptiert Doppelpunkt-Aufschlüsselung", () => {
    expect(
      isMnemonicWorthShowing(
        "Akronym: A - Atemwege, B - Breathing, C - Circulation."
      )
    ).toBe(true)
  })

  it("akzeptiert Texte mit explizitem Eselsbrücken-Schlagwort", () => {
    expect(
      isMnemonicWorthShowing(
        "Klassische Eselsbrücke für die 5 Phasen der Wundheilung."
      )
    ).toBe(true)
  })

  it("lehnt belanglose Sätze ohne Hook ab", () => {
    expect(
      isMnemonicWorthShowing(
        "Diese Erkrankung tritt oft im höheren Alter auf und betrifft meist Männer."
      )
    ).toBe(false)
  })
})
