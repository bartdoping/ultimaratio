import { describe, it, expect } from "vitest"
import { finalizeDraft, type RepairFn } from "../lib/generator-finalize"
import { detectOptionCues } from "../lib/option-cues"

const KERN = "Nitroglycerin senkt beim hypertensiven Lungenödem rasch die Vorlast."

/** Zufallsquelle nahe 1: Fisher-Yates tauscht dann nie — Reihenfolge bleibt. */
const KEIN_TAUSCH = () => 0.999999

function entwurf(optionen: string[], richtig: number) {
  return JSON.stringify({
    questions: [
      {
        stem: "Ein 74-jähriger Patient mit akutem Lungenödem und RR 188/104 mmHg. Welche Maßnahme ist vorrangig?",
        keyTakeaway: KERN,
        allowImmediate: true,
        caseVignette: null,
        options: optionen.map((text, i) => ({ text, isCorrect: i === richtig })),
      },
    ],
  })
}

// Tatsächlich so vom Generator erzeugt: A verrät sich durch die Absicherung,
// die Distraktoren durch Begründungen und Dringlichkeitswörter.
const VERRAETERISCH = [
  "Intravenöse Gabe von Nitroglycerin unter engmaschiger Blutdruckkontrolle",
  "Sofortige intravenöse Gabe von Dobutamin zur Steigerung des Herzzeitvolumens",
  "Intravenöse Volumengabe mit balancierter Elektrolytlösung zur Nierenperfusion",
  "Unverzügliche intravenöse Gabe von Morphin zur Behandlung der Dyspnoe",
  "Sofortige Anlage eines zentralvenösen Zugangs zur invasiven Volumentherapie",
]

const SAUBER = [
  "Intravenöse Gabe von Nitroglycerin",
  "Intravenöse Gabe von Dobutamin",
  "Intravenöse Gabe von Furosemid in Hochdosis",
  "Intravenöse Gabe von Morphin",
  "Intravenöse Gabe von Noradrenalin",
]

function stub(antwort: string) {
  const aufrufe: { scope?: string; hint: string }[] = []
  const fn: RepairFn = async (o) => {
    aufrufe.push({ scope: o.scope, hint: o.hint })
    return antwort
  }
  return { fn, aufrufe }
}

describe("finalizeDraft — formale Lösungshinweise", () => {
  it("bessert verräterische Optionen nach und übernimmt die saubere Fassung", async () => {
    expect(detectOptionCues(JSON.parse(entwurf(VERRAETERISCH, 0)).questions).length).toBeGreaterThan(0)

    const { fn } = stub(entwurf(SAUBER, 0))
    const r = await finalizeDraft({ rawText: entwurf(VERRAETERISCH, 0), mode: "single", expectedCount: 1, repair: fn, rand: KEIN_TAUSCH })

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.questions[0].options.map((o) => o.text)).toEqual(SAUBER)
    expect(detectOptionCues(r.questions).length).toBe(0)
  })

  it("ruft die Nachbesserung im Rahmen 'options' auf — nicht im Erklärungsrahmen", async () => {
    const { fn, aufrufe } = stub(entwurf(SAUBER, 0))
    await finalizeDraft({ rawText: entwurf(VERRAETERISCH, 0), mode: "single", expectedCount: 1, repair: fn, rand: KEIN_TAUSCH })
    expect(aufrufe).toHaveLength(1)
    expect(aufrufe[0].scope).toBe("options")
    expect(aufrufe[0].hint).toMatch(/FORMALE LÖSUNGSHINWEISE/)
  })

  it("verwirft eine Nachbesserung, die die richtige Antwort verschiebt", async () => {
    const { fn } = stub(entwurf(SAUBER, 2))
    const r = await finalizeDraft({ rawText: entwurf(VERRAETERISCH, 0), mode: "single", expectedCount: 1, repair: fn, rand: KEIN_TAUSCH })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // Die richtige Antwort bleibt A, die Optionen unverändert.
    expect(r.questions[0].options[0].isCorrect).toBe(true)
    expect(r.questions[0].options.map((o) => o.text)).toEqual(VERRAETERISCH)
  })

  it("verwirft eine Nachbesserung, die nicht weniger verrät", async () => {
    const { fn } = stub(entwurf(VERRAETERISCH, 0))
    const r = await finalizeDraft({ rawText: entwurf(VERRAETERISCH, 0), mode: "single", expectedCount: 1, repair: fn, rand: KEIN_TAUSCH })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.questions[0].options.map((o) => o.text)).toEqual(VERRAETERISCH)
  })

  it("übersteht eine fehlschlagende Nachbesserung ohne Fehler", async () => {
    const fn: RepairFn = async () => {
      throw new Error("API weg")
    }
    const r = await finalizeDraft({ rawText: entwurf(VERRAETERISCH, 0), mode: "single", expectedCount: 1, repair: fn, rand: KEIN_TAUSCH })
    expect(r.ok).toBe(true)
  })

  it("ruft keine Nachbesserung auf, wenn die Optionen sauber sind", async () => {
    const { fn, aufrufe } = stub("sollte nicht gebraucht werden")
    const r = await finalizeDraft({ rawText: entwurf(SAUBER, 0), mode: "single", expectedCount: 1, repair: fn, rand: KEIN_TAUSCH })
    expect(r.ok).toBe(true)
    expect(aufrufe).toHaveLength(0)
  })
})
