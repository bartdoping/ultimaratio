import { describe, it, expect } from "vitest"
import {
  applyRange,
  buildRuns,
  removeRunAt,
  trimRange,
  type HighlightSet,
} from "../lib/text-highlight"

const TEXT = "Ein 68-jähriger Patient mit NIHSS 8 wird vorgestellt."

/** Hilfsfunktion: markierte Zeichen als lesbarer Text. */
function markiert(text: string, set: HighlightSet): string {
  return buildRuns(text, set)
    .filter((r) => r.on)
    .map((r) => text.slice(r.start, r.end))
    .join("|")
}

describe("buildRuns", () => {
  it("fasst zusammenhängende Zeichen zu einem Block zusammen", () => {
    const set = new Set([4, 5, 6, 7])
    const runs = buildRuns("abcdefghij", set).filter((r) => r.on)
    expect(runs).toEqual([{ start: 4, end: 8, on: true }])
  })

  it("trennt Blöcke, die nicht aneinandergrenzen", () => {
    const runs = buildRuns("abcdefghij", new Set([1, 2, 6, 7])).filter((r) => r.on)
    expect(runs).toEqual([
      { start: 1, end: 3, on: true },
      { start: 6, end: 8, on: true },
    ])
  })

  it("deckt den Text lückenlos ab", () => {
    const runs = buildRuns(TEXT, new Set([4, 5, 6]))
    expect(runs[0].start).toBe(0)
    expect(runs[runs.length - 1].end).toBe(TEXT.length)
    runs.forEach((r, i) => {
      if (i > 0) expect(r.start).toBe(runs[i - 1].end)
    })
  })

  it("liefert für leeren Text nichts", () => {
    expect(buildRuns("", new Set())).toEqual([])
  })
})

describe("trimRange", () => {
  it("entfernt Leerzeichen an beiden Rändern", () => {
    expect(trimRange("  Wort  ", 0, 8)).toEqual([2, 6])
  })

  it("lässt eine saubere Auswahl unverändert", () => {
    expect(trimRange("Wort", 0, 4)).toEqual([0, 4])
  })

  it("liefert eine leere Spanne, wenn nur Leerraum gewählt wurde", () => {
    const [a, b] = trimRange("a   b", 1, 4)
    expect(b).toBeLessThanOrEqual(a)
  })

  it("begrenzt Positionen außerhalb des Textes", () => {
    expect(trimRange("abc", -5, 99)).toEqual([0, 3])
  })
})

describe("applyRange — markieren", () => {
  it("markiert ein einzelnes Zeichen", () => {
    const set = applyRange(TEXT, new Set(), 0, 1)
    expect(markiert(TEXT, set)).toBe("E")
  })

  it("markiert mehrere Wörter am Stück", () => {
    const von = TEXT.indexOf("68-jähriger")
    const bis = TEXT.indexOf("Patient") + "Patient".length
    const set = applyRange(TEXT, new Set(), von, bis)
    expect(markiert(TEXT, set)).toBe("68-jähriger Patient")
  })

  it("beschneidet mitgezogene Leerzeichen an den Rändern", () => {
    const von = TEXT.indexOf(" Patient")
    const bis = TEXT.indexOf(" mit")
    const set = applyRange(TEXT, new Set(), von, bis)
    expect(markiert(TEXT, set)).toBe("Patient")
  })

  it("ignoriert eine leere Auswahl", () => {
    const vorher = new Set([1, 2])
    expect(applyRange(TEXT, vorher, 5, 5)).toBe(vorher)
  })

  it("ignoriert eine Auswahl aus reinem Leerraum", () => {
    const vorher: HighlightSet = new Set()
    const leer = TEXT.indexOf(" ")
    expect(applyRange(TEXT, vorher, leer, leer + 1)).toBe(vorher)
  })
})

describe("applyRange — entfernen", () => {
  it("entfernt eine vollständig markierte Passage wieder", () => {
    const von = TEXT.indexOf("NIHSS")
    const bis = von + "NIHSS".length
    const mit = applyRange(TEXT, new Set(), von, bis)
    expect(markiert(TEXT, mit)).toBe("NIHSS")

    const ohne = applyRange(TEXT, mit, von, bis)
    expect(markiert(TEXT, ohne)).toBe("")
  })

  it("erweitert statt zu löschen, wenn die Auswahl nur teilweise markiert ist", () => {
    const von = TEXT.indexOf("NIHSS")
    const mit = applyRange(TEXT, new Set(), von, von + 5)
    // Auswahl geht über das bereits Markierte hinaus → erweitern.
    const erweitert = applyRange(TEXT, mit, von, von + 7)
    expect(markiert(TEXT, erweitert)).toBe("NIHSS 8")
  })

  it("entfernt auch, wenn beim Wiederziehen Leerzeichen mitgehen", () => {
    const von = TEXT.indexOf("Patient")
    const bis = von + "Patient".length
    const mit = applyRange(TEXT, new Set(), von, bis)
    // Nutzer zieht etwas großzügiger, inklusive der umgebenden Leerzeichen.
    const ohne = applyRange(TEXT, mit, von - 1, bis + 1)
    expect(markiert(TEXT, ohne)).toBe("")
  })
})

describe("removeRunAt", () => {
  it("entfernt den ganzen Block, egal wo man ihn trifft", () => {
    const von = TEXT.indexOf("68-jähriger")
    const bis = TEXT.indexOf("Patient") + "Patient".length
    const mit = applyRange(TEXT, new Set(), von, bis)

    const ohne = removeRunAt(TEXT, mit, von + 4)
    expect(markiert(TEXT, ohne)).toBe("")
  })

  it("lässt andere Blöcke unangetastet", () => {
    let set = applyRange(TEXT, new Set(), 0, 3)
    const von = TEXT.indexOf("NIHSS")
    set = applyRange(TEXT, set, von, von + 5)
    expect(markiert(TEXT, set)).toBe("Ein|NIHSS")

    const ohne = removeRunAt(TEXT, set, von + 1)
    expect(markiert(TEXT, ohne)).toBe("Ein")
  })

  it("tut nichts an unmarkierter Stelle", () => {
    const set = applyRange(TEXT, new Set(), 0, 3)
    expect(removeRunAt(TEXT, set, 20)).toBe(set)
  })
})

describe("Zeilenumbrüche", () => {
  const MEHRZEILIG = "Erste Zeile\nZweite Zeile"

  it("markiert über einen Zeilenumbruch hinweg", () => {
    const set = applyRange(MEHRZEILIG, new Set(), 6, 18)
    expect(markiert(MEHRZEILIG, set)).toBe("Zeile\nZweite")
  })

  it("behandelt den Umbruch am Rand als Leerraum", () => {
    // Index 11 ist das "\n"; es wird wie ein Leerzeichen abgeschnitten.
    const von = MEHRZEILIG.indexOf("\n")
    const bis = MEHRZEILIG.indexOf("Zweite") + "Zweite".length
    const set = applyRange(MEHRZEILIG, new Set(), von, bis)
    expect(markiert(MEHRZEILIG, set)).toBe("Zweite")
  })
})
