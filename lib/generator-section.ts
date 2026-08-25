/**
 * Prüfungsabschnitt einer generierten Frage.
 *
 * Das deutsche Medizinstudium prüft zwei grundverschiedene Wissensarten, und
 * eine Frage kann nicht beides sein:
 *
 *  - "vorklinik": Grundlagenfächer — Biochemie, Physiologie, Anatomie,
 *    Histologie, Embryologie, Biologie, Physik, Chemie, Medizinische
 *    Psychologie/Soziologie. Gefragt sind Mechanismus, Struktur und
 *    Zusammenhang. Eine Patientenvignette ist hier ein Fehler, kein Schmuck.
 *  - "klinik": Krankheitslehre und Patientenversorgung — Diagnostik, Therapie,
 *    Leitlinien, klinische Entscheidungsfindung.
 *  - "auto": Das Modell entscheidet anhand des Themas. Vorgabe für frei
 *    eingegebene Themen, wo die Plattform es nicht wissen kann.
 *
 * Lernpläne setzen den Wert fest (siehe `lib/learn-plans.ts`): Der
 * Physikum-Plan ist vorklinisch, der M2-Plan klinisch.
 */
export type GeneratorSection = "auto" | "vorklinik" | "klinik"

export const GENERATOR_SECTIONS: readonly GeneratorSection[] = [
  "auto",
  "vorklinik",
  "klinik",
]

export function isGeneratorSection(value: unknown): value is GeneratorSection {
  return typeof value === "string" && (GENERATOR_SECTIONS as readonly string[]).includes(value)
}
