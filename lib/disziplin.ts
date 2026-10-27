import { LEARN_PLAN_IDS } from "@/lib/learn-plans"
import { fachVonThema } from "@/lib/pruefungsreife"
import { normalizeTopic } from "@/lib/topic-key"
import type { GeneratorSection } from "@/lib/generator-section"

/**
 * Welches Fach fragt ein Thema ab?
 *
 * Der Generator würfelt pro Frage Variationsvorgaben (Fokus-Winkel, Kontext).
 * Kamen die aus einem gemeinsamen Topf für die ganze Vorklinik, landete ein
 * Anatomiethema wie "Unterarm" regelmäßig bei "In-vitro-Ansatz an isoliertem
 * Gewebe" + "allosterische Hemmung" — und wurde zur Physiologiefrage über ein
 * Sarkomer. Deshalb wird das Fach zuerst bestimmt und die Vorgaben kommen nur
 * noch aus dem passenden Fachtopf.
 */

export type Disziplin =
  // vorklinisch
  | "anatomie"
  | "histologie"
  | "embryologie"
  | "physiologie"
  | "biochemie"
  | "psychsoz"
  | "naturwiss"
  // klinisch
  | "klinik_quer"
  | "klinik"
  // nicht eindeutig: gemischter Topf (bisheriges Verhalten)
  | "allgemein"

export const DISZIPLIN_NAME: Record<Disziplin, string> = {
  anatomie: "Makroskopische Anatomie",
  histologie: "Histologie / Zellbiologie",
  embryologie: "Embryologie",
  physiologie: "Physiologie",
  biochemie: "Biochemie / Molekularbiologie",
  psychsoz: "Medizinische Psychologie und Soziologie",
  naturwiss: "Physik / Chemie für Mediziner",
  klinik_quer: "Klinisches Querschnittsfach (Epidemiologie, Rechts-, Arbeits-, Sozialmedizin)",
  klinik: "Klinische Medizin",
  allgemein: "",
}

// Reihenfolge = Vorrang: spezifische Fächer vor den breiten.
const REGELN: { d: Disziplin; re: RegExp }[] = [
  { d: "psychsoz", re: /psycholog|soziolog|lerntheor|konditionier|kommunikation|arzt-patient|persönlichkeit|bewältigung|coping|abwehrmechan|testgüte|reliabilit|validit|gesundheitsverhalten|stigma|sozialisation/ },
  { d: "naturwiss", re: /\bphysik|chemie\b|chemie |ionisierende|strahlung|thermodynamik|\boptik|akustik|aufbau der materie|elektrizit|radioaktiv|mechanik der|säure-base-chemie|chemische bindung/ },
  { d: "embryologie", re: /embryo|keimblatt|schlundbogen|schlundtasche|entstehung neuen lebens|befruchtung|plazenta|fetal|frühentwicklung|organogenese/ },
  { d: "biochemie", re: /atmungskette|purin|pyrimidin|nukleotid|genetik/ },
  { d: "histologie", re: /histolog|gewebe|epithel|knorpel|zellbiolog|die zelle|zellkontakt|zytoskelett|organell|mikroskop|\bhaut\b|hautanhang/ },
  {
    d: "anatomie",
    re: /anatomie|extremität|schulter|oberarm|ellenbogen|unterarm|\bhand\b|becken|hüfte|oberschenkel|\bknie|unterschenkel|sprunggelenk|\bfuß|rumpf|brustwand|bauchwand|nacken|rücken|wirbelsäule|brusthöhle|beckenhöhle|bauchraum|leitungsbahn|schädel|hirnnerv|kopf- und hals|kopf und hals|muskulatur von|kehlkopf|nasennebenhöhle|\bnase\b|topograph|plexus|situs|mediastinum|retroperiton|leistenkanal|gelenk|aufbau des herzens|gefäßversorgung|meningen|orbita|neuroanatomie|rückenmark|harnleiter|harnblase|harnröhre|^ohr$/,
  },
  { d: "biochemie", re: /biochem|stoffwechsel|citrat|zyklus|glykolys|glukoneogen|synthese|abbau|enzym|vitamin|lipid|aminosäure|nukleotid|\bdna|\brna|replikation|transkription|translation|signaltransduktion|ernährung|molekularbiolog/ },
  {
    d: "physiologie",
    re: /physiolog|potential|erregung|kreislauf|atmung|atemmechanik|niere|\bblut|sinnes|hören|sehen|kontraktion|motorik|vegetativ|hormon|endokrin|thermoregulation|reflex|herzmechanik|stofftransport|elektrolyt|säure-base-haushalt|wasserhaushalt|sensorik|nozizept|taktil|olfaktor|gustator|visuell|auditiv|vestibulär|schlaf|gedächtnis/,
  },
]

const KLINIK_QUER = /epidemiolog|biometr|statistik|rechtsmedizin|leichenschau|arbeitsmedizin|umweltmedizin|sozialmedizin|rehabilitation|gesundheitsökonom|ethik|geschichte der medizin|gesundheitssystem|berufskrankheit/

function klassifiziere(text: string): Disziplin | null {
  const t = text.toLowerCase()
  for (const r of REGELN) if (r.re.test(t)) return r.d
  return null
}

let planFach: Map<string, string> | null = null
function fachAusPlan(topic: string): string | null {
  if (!planFach) {
    planFach = new Map()
    for (const id of LEARN_PLAN_IDS) for (const [k, f] of fachVonThema(id)) if (!planFach.has(k)) planFach.set(k, f)
  }
  return planFach.get(normalizeTopic(topic)) ?? null
}

/**
 * Fach eines Themas. Das Thema selbst ist aussagekräftiger als das Planfach
 * ("Kehlkopf" unter "Kopf und Hals"), deshalb zuerst das Thema, dann das
 * Fach aus dem Lernplan. Ohne Treffer: "allgemein" (gemischter Topf).
 */
export function bestimmeDisziplin(topic: string, section: GeneratorSection = "auto"): Disziplin {
  const planfach = fachAusPlan(topic)
  if (section === "klinik") {
    return KLINIK_QUER.test(`${topic} ${planfach ?? ""}`.toLowerCase()) ? "klinik_quer" : "klinik"
  }
  const d = klassifiziere(topic) ?? (planfach ? klassifiziere(planfach) : null)
  if (d) return d
  if (section === "auto" && KLINIK_QUER.test(`${topic} ${planfach ?? ""}`.toLowerCase())) return "klinik_quer"
  return "allgemein"
}

export function istVorklinisch(d: Disziplin): boolean {
  return d !== "klinik" && d !== "klinik_quer" && d !== "allgemein"
}
