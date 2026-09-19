import { describe, it, expect } from "vitest"
import { buildCueRepairHint, detectOptionCues } from "../lib/option-cues"
import type { BulkQuestion } from "../lib/question-bulk-json"

function frage(optionen: string[], richtig: number): BulkQuestion {
  return {
    stem: "Welche Maßnahme ist jetzt vorrangig indiziert?",
    allowImmediate: true,
    options: optionen.map((text, i) => ({ text, isCorrect: i === richtig })),
  }
}

const arten = (q: BulkQuestion) => detectOptionCues([q]).map((c) => c.kind).sort()

describe("Reale Fehlerbilder aus generierten Fragen", () => {
  it("erkennt die Lungenödem-Frage: Absicherung nur an der richtigen, Dringlichkeit und Begründung nur an Distraktoren", () => {
    // Tatsächlich so vom Generator erzeugt; richtig ist A.
    const q = frage(
      [
        "Intravenöse Gabe von Nitroglycerin unter engmaschiger Blutdruckkontrolle",
        "Sofortige intravenöse Gabe von Dobutamin zur Steigerung des Herzzeitvolumens",
        "Intravenöse Volumengabe mit balancierter Elektrolytlösung zur Nierenperfusion",
        "Unverzügliche intravenöse Gabe von Morphin zur Behandlung der Dyspnoe",
        "Sofortige Anlage eines zentralvenösen Zugangs zur invasiven Volumentherapie",
      ],
      0
    )
    const k = arten(q)
    expect(k).toContain("absicherung")
    expect(k).toContain("begruendung")
    expect(k).toContain("dringlichkeit")
  })

  it("erkennt die Citratzyklus-Frage: nur die richtige Option ohne Scheinbegründung", () => {
    const q = frage(
      [
        "Die Mitochondrienmatrix entsteht aus dem Endoderm des Dottersacks und trägt deshalb bakterienähnliche Enzyme.",
        "Die Mitochondrienmatrix ist ein zytoplasmatisches Kompartiment mit endosymbiotischer Herkunft; sie ist keinem embryonalen Keimblatt zuzuordnen.",
        "Die Mitochondrienmatrix ist ein Derivat des Mesoderms, da besonders energieintensive Gewebe mesodermaler Herkunft viele Mitochondrien enthalten.",
        "Die Mitochondrienmatrix entsteht aus Neuralleistenzellen, weil mitochondriale Stoffwechselenzyme für die neuronale Differenzierung erforderlich sind.",
        "Die Mitochondrienmatrix geht aus dem Ektoderm hervor, da ihre innere Membran funktionell mit der Zellmembran verwandt ist.",
      ],
      1
    )
    const c = detectOptionCues([q]).find((x) => x.kind === "begruendung")
    expect(c).toBeDefined()
    expect(c!.staerke).toBe("stark")
  })
})

describe("Keine Fehlalarme bei sauberen Optionen", () => {
  it("meldet nichts bei gleichförmigen, begründungsfreien Optionen", () => {
    const q = frage(
      [
        "Intravenöse Gabe von Nitroglycerin",
        "Intravenöse Gabe von Dobutamin",
        "Intravenöse Gabe von Furosemid",
        "Intravenöse Gabe von Morphin",
        "Intravenöse Gabe von Noradrenalin",
      ],
      0
    )
    expect(detectOptionCues([q])).toEqual([])
  })

  it("meldet nichts, wenn ALLE Optionen eine Begründung tragen", () => {
    const q = frage(
      [
        "Nitroglycerin zur Senkung der Vorlast",
        "Dobutamin zur Steigerung der Kontraktilität",
        "Furosemid zur Steigerung der Diurese",
        "Morphin zur Linderung der Dyspnoe",
        "Noradrenalin zur Anhebung des Gefäßwiderstands",
      ],
      2
    )
    expect(arten(q)).not.toContain("begruendung")
  })

  it("wertet ein bloßes 'zum' ohne Zweck nicht als Begründung", () => {
    const q = frage(
      [
        "Überweisung zum Kardiologen",
        "Überweisung zum Nephrologen",
        "Überweisung zum Pneumologen",
        "Überweisung zum Neurologen",
        "Überweisung zum Gastroenterologen",
      ],
      3
    )
    expect(detectOptionCues([q])).toEqual([])
  })

  it("meldet Dringlichkeit nicht, wenn sie gleich verteilt ist", () => {
    const q = frage(
      [
        "Sofortige Koronarangiographie",
        "Sofortige systemische Lyse",
        "Sofortige Perikardpunktion",
        "Sofortige Kardioversion",
        "Sofortige Thorakotomie",
      ],
      0
    )
    expect(arten(q)).not.toContain("dringlichkeit")
  })
})

describe("Stärkegrade", () => {
  it("stuft 'die richtige ist die einzige' als stark ein", () => {
    const q = frage(
      [
        "Gabe von Heparin unter engmaschiger Kontrolle",
        "Gabe von Alteplase",
        "Gabe von Tenecteplase",
        "Gabe von Clopidogrel",
        "Gabe von Ticagrelor",
      ],
      0
    )
    const c = detectOptionCues([q]).find((x) => x.kind === "absicherung")
    expect(c?.staerke).toBe("stark")
  })

  it("stuft 'die richtige teilt das Merkmal mit nur einer weiteren' als mittel ein", () => {
    const q = frage(
      [
        "Gabe von Heparin unter engmaschiger Kontrolle",
        "Gabe von Alteplase unter engmaschiger Kontrolle",
        "Gabe von Tenecteplase",
        "Gabe von Clopidogrel",
        "Gabe von Ticagrelor",
      ],
      0
    )
    const c = detectOptionCues([q]).find((x) => x.kind === "absicherung")
    expect(c?.staerke).toBe("mittel")
  })
})

describe("Länge", () => {
  it("erkennt eine auffällig längere richtige Antwort", () => {
    const q = frage(
      [
        "Heparin",
        "Alteplase",
        "Intravenöse Antikoagulation mit unfraktioniertem Heparin nach Bolus",
        "Clopidogrel",
        "Aspirin",
      ],
      2
    )
    expect(arten(q)).toContain("laenge")
  })

  it("lässt normale Längenstreuung durch", () => {
    const q = frage(
      [
        "Intravenöse Gabe von Heparin",
        "Intravenöse Gabe von Alteplase",
        "Orale Gabe von Apixaban",
        "Orale Gabe von Clopidogrel",
        "Subkutane Gabe von Enoxaparin",
      ],
      4
    )
    expect(arten(q)).not.toContain("laenge")
  })
})

describe("buildCueRepairHint", () => {
  it("ist leer ohne Befund", () => {
    expect(buildCueRepairHint([])).toBe("")
  })

  it("nennt Befund, Regeln und die unveränderliche richtige Aussage", () => {
    const hint = buildCueRepairHint([
      { questionIndex: 0, kind: "begruendung", staerke: "stark", detail: "Frage 1: Test." },
    ])
    expect(hint).toContain("Frage 1: Test.")
    expect(hint).toMatch(/KEINE Option trägt eine Begründung/)
    expect(hint).toMatch(/AUSSAGE der richtigen Option/)
  })
})

describe("Muster aus der Vorher-Messung", () => {
  it("erkennt Pauschalwörter, mit denen sich Distraktoren selbst widerlegen", () => {
    // Lungenembolie, Stufe 3 — richtig ist C, die einzige abwägende Option.
    const q = frage(
      [
        "Sofortige therapeutische Antikoagulation mit unfraktioniertem Heparin ohne weitere Diagnostik",
        "Bestimmung von D-Dimeren als alleinige Ausschlussdiagnostik",
        "Strukturierte Abschätzung der klinischen Vortestwahrscheinlichkeit und bei hoher Wahrscheinlichkeit direkte CT-Pulmonalisangiographie",
        "Primäre transthorakale Echokardiographie zum Ausschluss einer Lungenembolie",
        "Duplexsonographie der Beinvenen als alleinige Diagnostik einer vermuteten Lungenembolie",
      ],
      2
    )
    const k = arten(q)
    expect(k).toContain("dringlichkeit")
    expect(k).toContain("laenge")
  })

  it("erkennt die mäßig, aber deutlich längere richtige Antwort (Stufe 3, Aktionspotential)", () => {
    const q = frage(
      [
        "x".repeat(122),
        "x".repeat(142),
        "x".repeat(167),
        "x".repeat(136),
        "x".repeat(140),
      ],
      2
    )
    expect(arten(q)).toContain("laenge")
  })
})

describe("Themenecho", () => {
  it("erkennt die richtige Antwort, die das Thema selbst nennt", () => {
    // Gemessen, Stufe 5: Thema "Ambulant erworbene Pneumonie".
    const q = frage(
      ["Ambulant erworbene Pneumonie", "Akute Cholangitis", "Spontan-bakterielle Peritonitis", "Hepatische Enzephalopathie ohne Infekt", "Akute alkoholische Hepatitis"],
      0
    )
    const k = detectOptionCues([q], "Ambulant erworbene Pneumonie").map((c) => c.kind)
    expect(k).toContain("themenecho")
  })

  it("meldet nichts, wenn alle Optionen das Thema aufgreifen", () => {
    const q = frage(
      ["Im Citratzyklus entsteht GTP", "Im Citratzyklus entsteht FADH2", "Im Citratzyklus entsteht NADPH", "Im Citratzyklus entsteht ATP", "Im Citratzyklus entsteht Laktat"],
      1
    )
    expect(detectOptionCues([q], "Citratzyklus").map((c) => c.kind)).not.toContain("themenecho")
  })

  it("prüft ohne Thema kein Echo", () => {
    const q = frage(["Ambulant erworbene Pneumonie", "B", "C", "D", "E"].map((t) => t.padEnd(20, ".")), 0)
    expect(detectOptionCues([q]).map((c) => c.kind)).not.toContain("themenecho")
  })

  it("verlangt für ein Echo den Umbau der Frage", async () => {
    const { needsQuestionRework, buildCueRepairHint } = await import("../lib/option-cues")
    const cues = detectOptionCues(
      [frage(["Ambulant erworbene Pneumonie", "Akute Cholangitis", "Peritonitis", "Enzephalopathie", "Hepatitis"], 0)],
      "Ambulant erworbene Pneumonie"
    )
    expect(needsQuestionRework(cues)).toBe(true)
    expect(buildCueRepairHint(cues)).toMatch(/THEMENECHO/)
  })
})
