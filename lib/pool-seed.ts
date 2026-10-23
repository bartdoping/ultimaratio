import type { GeneratorSection } from "@/lib/generator-section"
import { LEARN_PLANS, LEARN_PLAN_IDS, generatableTopics, type LearnPlanId } from "@/lib/learn-plans"
import { normalizeTopic } from "@/lib/pool"

/**
 * Planung für das Vorbefüllen des Fragenpools (scripts/pool-seed.ts).
 * Rein und ohne Datenbank — damit prüfbar, was ein Lauf erzeugen würde.
 */

export type SeedTopic = { topic: string; topicKey: string; section: GeneratorSection; plan: LearnPlanId }
export type SeedJob = { topic: string; section: GeneratorSection; difficulty: number }

/** Alle Lernplan-Themen, je Thema einmal (gleiche Schreibweise = gleiches Thema). */
export function seedTopics(plans: readonly LearnPlanId[] = LEARN_PLAN_IDS): SeedTopic[] {
  const out = new Map<string, SeedTopic>()
  for (const plan of plans) {
    for (const d of LEARN_PLANS[plan].days) {
      for (const topic of generatableTopics(plan, d.day)) {
        const topicKey = normalizeTopic(topic)
        if (topicKey && !out.has(topicKey)) out.set(topicKey, { topic, topicKey, section: LEARN_PLANS[plan].section, plan })
      }
    }
  }
  return [...out.values()]
}

/**
 * Was fehlt bis zur Zielmenge je Thema und Stufe? `vorhanden` zählt aktive
 * Poolfragen je "topicKey|stufe" — ein abgebrochener Lauf setzt so einfach fort.
 */
export function seedJobs(
  topics: SeedTopic[],
  vorhanden: Map<string, number>,
  stufen: number[],
  proThema: number
): SeedJob[] {
  const jobs: SeedJob[] = []
  // Erst jede Stufe/jedes Thema einmal, dann die zweite Runde — so ist bei
  // einem Abbruch jedes Thema schon einmal abgedeckt.
  for (let runde = 0; runde < proThema; runde++) {
    for (const t of topics) {
      for (const s of stufen) {
        if ((vorhanden.get(`${t.topicKey}|${s}`) ?? 0) <= runde) jobs.push({ topic: t.topic, section: t.section, difficulty: s })
      }
    }
  }
  return jobs
}
