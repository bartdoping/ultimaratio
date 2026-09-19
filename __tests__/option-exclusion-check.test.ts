import { describe, it, expect } from "vitest"
import {
  buildExclusionInput,
  buildExclusionRepairHint,
  needsOptionRework,
  parseExclusionResult,
} from "../lib/option-exclusion-check"
import type { BulkQuestion } from "../lib/question-bulk-json"

const q: BulkQuestion = {
  stem: "Welche Maßnahme ist vorrangig?",
  allowImmediate: true,
  options: ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"].map((text, i) => ({ text, isCorrect: i === 2 })),
}

/** Zufall nahe 1 → keine Vertauschung, Zuordnung ist die Identität. */
const IDENT = () => 0.999999

describe("buildExclusionInput", () => {
  it("zeigt nur die Optionen, nicht die Fragestellung", () => {
    const { input } = buildExclusionInput(q, IDENT)
    expect(input).not.toContain(q.stem)
    for (const o of q.options) expect(input).toContain(o.text)
    expect(input).toMatch(/json/i)
  })

  it("mischt die Reihenfolge und liefert die Rückzuordnung", () => {
    const { input, zuordnung } = buildExclusionInput(q, () => 0)
    expect([...zuordnung].sort()).toEqual([0, 1, 2, 3, 4])
    // Zeile 1 zeigt die Option, die laut Zuordnung an erster Stelle steht.
    expect(input).toContain(`1) ${q.options[zuordnung[0]].text}`)
  })
})

describe("parseExclusionResult", () => {
  it("rechnet Anzeige-Nummern auf die Originalreihenfolge zurück", () => {
    const zuordnung = [4, 3, 2, 1, 0]
    const r = parseExclusionResult(
      '{"ausschliessbar":[{"nr":1,"grund":"absurd"}],"verdaechtig":{"nr":3,"grund":"einzig abwägend"}}',
      zuordnung
    )
    expect(r.ausschliessbar).toEqual([{ index: 4, grund: "absurd" }])
    expect(r.verdaechtig).toEqual({ index: 2, grund: "einzig abwägend" })
  })

  it("verkraftet Unsinn, doppelte Nummern und Werte außerhalb", () => {
    const r = parseExclusionResult(
      'Vorrede {"ausschliessbar":[{"nr":2},{"nr":2},{"nr":9},{"nr":"x"}],"verdaechtig":null} Nachrede',
      [0, 1, 2, 3, 4]
    )
    expect(r.ausschliessbar).toEqual([{ index: 1, grund: "" }])
    expect(r.verdaechtig).toBeNull()
  })

  it("liefert ein leeres Ergebnis bei ungültigem JSON — nie einen Fehler", () => {
    expect(parseExclusionResult("kaputt", [0, 1, 2, 3, 4])).toEqual({ ausschliessbar: [], verdaechtig: null })
  })
})

describe("Tipp mit Sicherheit", () => {
  it("wertet nur einen SICHEREN Tipp als Befund", () => {
    const z = [0, 1, 2, 3, 4]
    expect(parseExclusionResult('{"ausschliessbar":[],"tipp":{"nr":3,"sicherheit":"hoch","grund":"Prototyp"}}', z).verdaechtig)
      .toEqual({ index: 2, grund: "Prototyp" })
    expect(parseExclusionResult('{"ausschliessbar":[],"tipp":{"nr":3,"sicherheit":"niedrig","grund":"geraten"}}', z).verdaechtig)
      .toBeNull()
    expect(parseExclusionResult('{"ausschliessbar":[],"tipp":{"nr":3,"sicherheit":"mittel"}}', z).verdaechtig)
      .toBeNull()
  })
})

describe("needsOptionRework", () => {
  it("löst bei zwei streichbaren Distraktoren aus", () => {
    expect(
      needsOptionRework(q, { ausschliessbar: [{ index: 0, grund: "" }, { index: 4, grund: "" }], verdaechtig: null })
    ).toBe(true)
  })

  it("löst bei einem einzelnen streichbaren Distraktor NICHT aus", () => {
    expect(needsOptionRework(q, { ausschliessbar: [{ index: 0, grund: "" }], verdaechtig: null })).toBe(false)
  })

  it("zählt die richtige Antwort nicht als streichbaren Distraktor", () => {
    // Wirkt die RICHTIGE ohne Fachwissen falsch, ist das kein Verrat — eher gut.
    expect(
      needsOptionRework(q, { ausschliessbar: [{ index: 2, grund: "" }, { index: 0, grund: "" }], verdaechtig: null })
    ).toBe(false)
  })

  it("löst aus, wenn die richtige Antwort ohne Fachwissen heraussticht", () => {
    expect(needsOptionRework(q, { ausschliessbar: [], verdaechtig: { index: 2, grund: "" } })).toBe(true)
  })

  it("löst nicht aus, wenn ein Distraktor fälschlich als richtig heraussticht", () => {
    expect(needsOptionRework(q, { ausschliessbar: [], verdaechtig: { index: 1, grund: "" } })).toBe(false)
  })
})

describe("buildExclusionRepairHint", () => {
  it("nennt die Befunde in Buchstaben und hält die richtige Aussage fest", () => {
    const hint = buildExclusionRepairHint(q, {
      ausschliessbar: [{ index: 0, grund: "Pauschalaussage" }],
      verdaechtig: { index: 2, grund: "einzige abwägende Formulierung" },
    })
    expect(hint).toContain("Option A ohne Fachwissen streichen: Pauschalaussage")
    expect(hint).toContain("die richtige Option C ohne Fachwissen erkennen: einzige abwägende Formulierung")
    expect(hint).toMatch(/AUSSAGE der richtigen Option, ihre Position und die Markierung isCorrect bleiben unverändert/)
  })
})
