import { describe, expect, it } from "vitest"
import { fachVonThema, faecher, pruefungsreife, schwaechsteFaecher } from "@/lib/pruefungsreife"
import { normalizeTopic } from "@/lib/topic-key"

describe("faecher", () => {
  it("ordnet jedes Thema genau einem Fach zu", () => {
    for (const plan of ["m1", "m2"] as const) {
      const alle = faecher(plan).flatMap((f) => f.topics.map(normalizeTopic))
      expect(new Set(alle).size).toBe(alle.length)
      expect(alle.length).toBeGreaterThan(100)
    }
  })
})

describe("pruefungsreife", () => {
  const plan = "m2" as const
  const f = faecher(plan)[0]
  const [t1, t2] = f.topics

  it("beherrscht ab 70 % zuletzt richtig", () => {
    const r = pruefungsreife(plan, [
      { topic: t1, attempts: 1, lastCorrect: true },
      { topic: t1, attempts: 2, lastCorrect: true },
      { topic: t1, attempts: 1, lastCorrect: false },
      { topic: t2, attempts: 1, lastCorrect: false },
      { topic: "Nicht im Plan", attempts: 3, lastCorrect: true },
    ])
    const fr = r.faecher.find((x) => x.fach === f.fach)!
    expect(fr.gekreuzt).toBe(2)
    expect(fr.beherrscht).toBe(0) // t1: 2/3 = 67 % < 70 %
    expect(r.gesamt.gekreuzt).toBe(2)
  })

  it("unbeantwortete Fragen zählen nicht", () => {
    const r = pruefungsreife(plan, [{ topic: t1, attempts: 0, lastCorrect: null }])
    expect(r.gesamt.gekreuzt).toBe(0)
  })

  it("Schreibweise egal", () => {
    const r = pruefungsreife(plan, [{ topic: `  ${t1.toUpperCase()} `, attempts: 1, lastCorrect: true }])
    expect(r.gesamt.beherrscht).toBe(1)
    expect(fachVonThema(plan).get(normalizeTopic(t1))).toBe(f.fach)
  })

  it("angefangene, unsichere Fächer zuerst — sichere zuletzt", () => {
    const andere = faecher(plan)[5]
    const r = pruefungsreife(plan, [
      { topic: t1, attempts: 1, lastCorrect: true },
      { topic: andere.topics[0], attempts: 1, lastCorrect: false },
    ])
    const reihenfolge = schwaechsteFaecher(r, 50)
    expect(reihenfolge[0].fach).toBe(andere.fach)
    expect(reihenfolge.at(-1)!.fach).toBe(f.fach)
  })
})
