import { describe, it, expect } from "vitest"
import {
  buildUserPrompt,
  buildSystemInstructions,
} from "../lib/ai-question-generator-prompt"

/**
 * Regressionstests für die Schwierigkeits-Kalibrierung.
 *
 * Hintergrund: Die Variabilitäts-Vorgaben (Fokus-Winkel, Patient-Archetyp,
 * Anti-Reflex) galten früher für ALLE Stufen gleich. Eine Stufe-1-Frage
 * ("ein Laie kann das beantworten") erhielt dadurch u. a. die Anweisung, dass
 * die naheliegende Antwort NICHT die Lösung sein darf — leichte Stufen wurden
 * dadurch schwerer als schwere. Diese Tests halten die Staffelung fest.
 */

const P = (difficulty: number, seed = 12345) =>
  buildUserPrompt({ topic: "Schlaganfall", difficulty, mode: "single", variabilitySeed: seed })

describe("Anti-Reflex ist stufenabhängig", () => {
  it("erscheint NICHT auf Stufe 1 und 2", () => {
    expect(P(1)).not.toMatch(/VERBOTENER STANDARD-REFLEX/)
    expect(P(2)).not.toMatch(/VERBOTENER STANDARD-REFLEX/)
  })

  it("erscheint ab Stufe 3", () => {
    expect(P(3)).toMatch(/VERBOTENER STANDARD-REFLEX/)
    expect(P(4)).toMatch(/VERBOTENER STANDARD-REFLEX/)
    expect(P(5)).toMatch(/VERBOTENER STANDARD-REFLEX/)
  })

  it("erscheint über alle Seeds hinweg nie auf Stufe 1", () => {
    for (let seed = 0; seed < 60; seed++) {
      expect(P(1, seed)).not.toMatch(/VERBOTENER STANDARD-REFLEX/)
    }
  })
})

describe("Patient-Archetyp ist stufenabhängig", () => {
  it("fehlt auf Stufe 1 (Stem soll 1–2 Sätze ohne Fallkontext sein)", () => {
    for (let seed = 0; seed < 40; seed++) {
      expect(P(1, seed)).not.toMatch(/PATIENT-ARCHETYP/)
    }
  })

  it("ist ab Stufe 2 vorhanden", () => {
    expect(P(2)).toMatch(/PATIENT-ARCHETYP/)
    expect(P(5)).toMatch(/PATIENT-ARCHETYP/)
  })

  it("nutzt auf Stufe 2 keine stark erschwerenden Konstellationen", () => {
    const verboten = /Transplantation|Leberzirrhose|Migrationsmedizin|BMI > 40/
    for (let seed = 0; seed < 60; seed++) {
      expect(P(2, seed)).not.toMatch(verboten)
    }
  })
})

describe("Fokus-Winkel sind stufengerecht", () => {
  it("nutzt auf Stufe 1 nur einfache Winkel", () => {
    const zuSchwer =
      /zellulärer \/ molekularer Ebene|Atypische klinische Präsentation|Pharmakokinetik|Score \/ Klassifikation|Differenzialdiagnose:|Cut-Off/
    for (let seed = 0; seed < 60; seed++) {
      expect(P(1, seed)).not.toMatch(zuSchwer)
    }
  })

  it("hält Curiosa-Winkel unterhalb von Stufe 5 zurück", () => {
    const curiosa = /Eponym oder historischer Curiosum|Studienzahl oder Cut-Off aus Originalpublikation/
    for (let seed = 0; seed < 60; seed++) {
      for (const lvl of [1, 2, 3, 4]) {
        expect(P(lvl, seed)).not.toMatch(curiosa)
      }
    }
  })
})

describe("Stufen-Vorrang im System-Prompt", () => {
  const sys = buildSystemInstructions()

  it("stellt die Stufe ausdrücklich über die übrigen Regeln", () => {
    expect(sys).toMatch(/VORRANG DER SCHWIERIGKEITSSTUFE/)
    expect(sys).toMatch(/gewinnt IMMER die Stufe/)
  })

  it("hebt die Anti-Trivialitäts-Regeln für Stufe 1–2 explizit auf", () => {
    expect(sys).toMatch(/Die naheliegende, offensichtliche Antwort IST die richtige Antwort/)
    expect(sys).toMatch(/Basiswissen und Lehrbuch-Definitionen sind auf diesen Stufen ausdrücklich RICHTIG/)
  })

  it("begrenzt Verkomplizierung und harte Distraktoren auf Stufe 3+", () => {
    expect(sys).toMatch(/auf Stufe 1–2 ist sie UNTERSAGT/)
    expect(sys).toMatch(/Auf Stufe 1–2 dürfen Distraktoren dagegen klar falsch sein/)
  })
})

describe("Selbst-Check passt sich der Stufe an", () => {
  it("fordert auf leichten Stufen aktiv Einfachheit ein", () => {
    const p = P(1)
    expect(p).toMatch(/Ist die Frage WIRKLICH so leicht wie angefordert/)
    expect(p).toMatch(/ist sie ZU SCHWER/)
  })

  it("verlangt auf leichten Stufen NICHT 'jenseits trivialer Lehrbuch-Definitionen'", () => {
    expect(P(1)).not.toMatch(/jenseits trivialer Lehrbuch-Definitionen/)
    expect(P(2)).not.toMatch(/jenseits trivialer Lehrbuch-Definitionen/)
  })

  it("verlangt es ab Stufe 3 weiterhin", () => {
    expect(P(3)).toMatch(/jenseits trivialer Lehrbuch-Definitionen/)
  })

  it("besteht auch auf leichten Stufen auf vollständigen Erklärungen", () => {
    expect(P(1)).toMatch(/Erklärung bleibt auch auf leichten Stufen vollständig/)
  })
})

describe("Fallfragen mit gemischten Stufen", () => {
  it("richtet die Variabilität an der höchsten Teilfragen-Stufe aus", () => {
    const p = buildUserPrompt({
      topic: "Schlaganfall",
      difficulty: 1,
      mode: "case",
      caseQuestionCount: 3,
      difficulties: [1, 1, 5],
      variabilitySeed: 3,
    })
    // Höchste Stufe ist 5 → Anti-Reflex ist zulässig.
    expect(p).toMatch(/VERBOTENER STANDARD-REFLEX/)
    // Die einzelnen Stufen bleiben trotzdem einzeln ausgewiesen.
    expect(p).toMatch(/Teilfrage 1: Stufe 1 von 5/)
    expect(p).toMatch(/Teilfrage 3: Stufe 5 von 5/)
  })

  it("bleibt bei durchgehend leichten Teilfragen frei vom Anti-Reflex", () => {
    const p = buildUserPrompt({
      topic: "Schlaganfall",
      difficulty: 1,
      mode: "case",
      caseQuestionCount: 3,
      difficulties: [1, 2, 2],
      variabilitySeed: 3,
    })
    expect(p).not.toMatch(/VERBOTENER STANDARD-REFLEX/)
  })
})
