import { describe, it, expect } from "vitest"
import { extractLivePreview } from "../lib/stream-preview"

describe("extractLivePreview", () => {
  it("liefert leere Vorschau bei leerem Text", () => {
    const p = extractLivePreview("")
    expect(p.stem).toBeNull()
    expect(p.options).toEqual([])
    expect(p.phase).toBe("start")
  })

  it("extrahiert eine noch unvollständige Fragestellung", () => {
    const partial = '{"questions":[{"stem":"Ein 68-jähriger Patient mit'
    const p = extractLivePreview(partial)
    expect(p.stem).toContain("68-jähriger Patient")
    expect(p.phase).toBe("stem")
  })

  it("extrahiert vollständige Fragestellung + Optionen", () => {
    const text =
      '{"questions":[{"stem":"Welche Akuttherapie ist indiziert?","options":[' +
      '{"text":"Thrombolyse mit rtPA","isCorrect":true},' +
      '{"text":"Sofortige Antikoagulation","isCorrect":false}'
    const p = extractLivePreview(text)
    expect(p.stem).toBe("Welche Akuttherapie ist indiziert?")
    expect(p.options).toEqual(["Thrombolyse mit rtPA", "Sofortige Antikoagulation"])
    expect(p.phase).toBe("options")
  })

  it("erkennt die Erklärungs-Phase", () => {
    const text =
      '{"questions":[{"stem":"Frage?","keyTakeaway":"Kernaussage","options":[{"text":"A","isCorrect":true}'
    const p = extractLivePreview(text)
    // keyTakeaway zählt zur Erklärungs-/Polishing-Phase.
    expect(["explanations", "polishing"]).toContain(p.phase)
  })

  it("behandelt escapte Anführungszeichen im String korrekt", () => {
    const text = '{"questions":[{"stem":"Er sagte \\"Hallo\\" laut","options":['
    const p = extractLivePreview(text)
    expect(p.stem).toBe('Er sagte "Hallo" laut')
  })

  it("wirft nie bei kaputtem JSON", () => {
    expect(() => extractLivePreview('{"questions":[{"stem":')).not.toThrow()
    expect(() => extractLivePreview("völliger unsinn ohne json")).not.toThrow()
  })
})
