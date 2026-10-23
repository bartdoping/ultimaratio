import { describe, expect, it } from "vitest"
import { blindAuswertung, blindTipp } from "@/lib/blindtest"

describe("blindTipp", () => {
  it("rechnet die Anzeigenummer auf den Originalindex zurück", () => {
    expect(blindTipp('{"tipp":{"nr":2,"sicherheit":"niedrig"}}', [4, 0, 3, 1, 2])).toBe(0)
  })
  it("toleriert Text um das JSON und Unsinn", () => {
    expect(blindTipp('Antwort: {"tipp":{"nr":1}} fertig', [3, 2, 1, 0, 4])).toBe(3)
    expect(blindTipp("kaputt", [0, 1])).toBeNull()
    expect(blindTipp('{"tipp":{"nr":9}}', [0, 1])).toBeNull()
  })
})

describe("blindAuswertung", () => {
  it("bewertet gegen das 30-%-Ziel", () => {
    const a = blindAuswertung([
      { difficulty: 3, getroffen: true },
      { difficulty: 3, getroffen: false },
      { difficulty: 5, getroffen: false },
      { difficulty: 5, getroffen: false },
    ])
    expect(a.gesamt.quote).toBe(0.25)
    expect(a.bestanden).toBe(true)
    expect(a.jeStufe).toEqual([
      { difficulty: 3, n: 2, quote: 0.5 },
      { difficulty: 5, n: 2, quote: 0 },
    ])
  })
  it("leere Messung ist kein Ergebnis", () => {
    expect(blindAuswertung([]).bestanden).toBeNull()
  })
})
