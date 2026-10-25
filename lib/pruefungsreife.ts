import { LEARN_PLANS, generatableTopics, type LearnPlanId } from "@/lib/learn-plans"
import { normalizeTopic } from "@/lib/topic-key"

/**
 * Prüfungsreife: Wie viel des Lernplans beherrschst du schon?
 *
 * Ein Thema gilt als beherrscht, wenn mindestens 70 % der dazu gekreuzten
 * Fragen zuletzt richtig beantwortet wurden. Prüfungsreife = Anteil
 * beherrschter Themen am ganzen Plan — je Fach und gesamt. Bewusst einfach
 * und ehrlich: keine erfundene Bestehenswahrscheinlichkeit.
 */

export const BEHERRSCHT_AB = 0.7

export type Fach = { fach: string; topics: string[] }

const cache = new Map<LearnPlanId, Fach[]>()

/** Fächer eines Plans mit ihren Themen (jedes Thema genau einem Fach zugeordnet). */
export function faecher(planId: LearnPlanId): Fach[] {
  const hit = cache.get(planId)
  if (hit) return hit
  const map = new Map<string, string[]>()
  const vergeben = new Set<string>()
  for (const d of LEARN_PLANS[planId].days) {
    for (const t of generatableTopics(planId, d.day)) {
      const k = normalizeTopic(t)
      if (!k || vergeben.has(k)) continue
      vergeben.add(k)
      const liste = map.get(d.subject) ?? []
      liste.push(t)
      map.set(d.subject, liste)
    }
  }
  const out = [...map.entries()].map(([fach, topics]) => ({ fach, topics }))
  cache.set(planId, out)
  return out
}

/** Thema → Fach (normalisiert). */
export function fachVonThema(planId: LearnPlanId): Map<string, string> {
  const m = new Map<string, string>()
  for (const f of faecher(planId)) for (const t of f.topics) m.set(normalizeTopic(t), f.fach)
  return m
}

export type FachReife = { fach: string; themen: number; gekreuzt: number; beherrscht: number }
export type Reife = { gesamt: { themen: number; gekreuzt: number; beherrscht: number }; faecher: FachReife[] }

/** Zeilen aus "Meine Fragen" (je Frage: Thema, beantwortet?, zuletzt richtig?). */
export function pruefungsreife(
  planId: LearnPlanId,
  zeilen: { topic: string; attempts: number; lastCorrect: boolean | null }[]
): Reife {
  const jeThema = new Map<string, { n: number; richtig: number }>()
  for (const z of zeilen) {
    if (z.attempts <= 0) continue
    const k = normalizeTopic(z.topic)
    const e = jeThema.get(k) ?? { n: 0, richtig: 0 }
    e.n++
    if (z.lastCorrect) e.richtig++
    jeThema.set(k, e)
  }
  const result: FachReife[] = faecher(planId).map((f) => {
    let gekreuzt = 0
    let beherrscht = 0
    for (const t of f.topics) {
      const e = jeThema.get(normalizeTopic(t))
      if (!e) continue
      gekreuzt++
      if (e.richtig / e.n >= BEHERRSCHT_AB) beherrscht++
    }
    return { fach: f.fach, themen: f.topics.length, gekreuzt, beherrscht }
  })
  const summe = (k: "themen" | "gekreuzt" | "beherrscht") => result.reduce((s, r) => s + r[k], 0)
  return { gesamt: { themen: summe("themen"), gekreuzt: summe("gekreuzt"), beherrscht: summe("beherrscht") }, faecher: result }
}

/**
 * Wo eine Übungsrunde am meisten bringt:
 *  1. Fächer mit angefangenen, aber noch nicht sicheren Themen (die meisten offenen zuerst),
 *  2. dann unberührte Fächer (die größten zuerst),
 *  3. zuletzt der Rest nach Reife aufsteigend.
 */
export function schwaechsteFaecher(r: Reife, n = 3): FachReife[] {
  const offen = (f: FachReife) => f.gekreuzt - f.beherrscht
  const gruppe = (f: FachReife) => (offen(f) > 0 ? 0 : f.gekreuzt === 0 ? 1 : 2)
  const quote = (f: FachReife) => (f.themen ? f.beherrscht / f.themen : 0)
  return [...r.faecher]
    .sort(
      (a, b) =>
        gruppe(a) - gruppe(b) ||
        (gruppe(a) === 0 ? offen(b) - offen(a) : gruppe(a) === 1 ? b.themen - a.themen : quote(a) - quote(b))
    )
    .slice(0, n)
}
