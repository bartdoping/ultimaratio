import prisma from "@/lib/db"
import { getGeneratorDayKey } from "@/lib/generator-limits"
import type { GeneratorQuotaSubject } from "@/lib/generator-limits"
import { effektivVerbraucht } from "@/lib/ip-anteil"

/**
 * Tageskontingent für Fragen AUS DEM POOL.
 *
 * Poolfragen kosten keine KI-Aufrufe mehr — sie sind bereits erzeugt und
 * geprüft. Deshalb ein großzügiges eigenes Kontingent, getrennt vom knappen
 * Kontingent für Neugenerierungen:
 *   - anonym:          10 pro Tag (macht neugierig, Anmeldung lohnt sich)
 *   - angemeldet, Free: 25 pro Tag (genug, um süchtig zu werden)
 *   - Pro / Admin:      unbegrenzt
 *
 * Fällige Wiederholungen aus "Meine Fragen" zählen NICHT — die gehören dem
 * Nutzer bereits.
 */
import { POOL_LIMIT_ANON, POOL_LIMIT_FREE } from "@/lib/generator-plan-config"
export { POOL_LIMIT_ANON, POOL_LIMIT_FREE }

export type PoolQuotaSnapshot = {
  /** Heute im Kreuz-Modus beantwortet — das Kontingent, das Nutzer erleben. */
  used: number
  limit: number
  /** Noch beantwortbare Fragen heute (-1 = unbegrenzt). */
  remaining: number
  /** Noch auslieferbare Fragen heute — Schutz vor Abruf ohne Antwort (-1 = unbegrenzt). */
  serveRemaining: number
  unlimited: boolean
}

/**
 * Gezählt wird, was beantwortet wird — nicht, was ausgeliefert wird. Der
 * Puffer lädt je Thema einige Fragen vor; würde das zählen, wäre das
 * Kontingent bei mehreren angetesteten Themen weg, bevor es beantwortet ist.
 *
 * Damit niemand ohne zu antworten beliebig viele Fragen (und damit
 * Neugenerierungen) abruft, gibt es zusätzlich eine großzügige Obergrenze
 * für Auslieferungen.
 */
export function serveCap(limit: number): number {
  return limit * 2 + 8
}

function limitFor(s: GeneratorQuotaSubject): number {
  if (s.isPro || s.isAdmin) return -1
  return s.userId ? POOL_LIMIT_FREE : POOL_LIMIT_ANON
}

type Feld = "poolCount" | "poolAnswerCount"

async function readUsed(s: GeneratorQuotaSubject, dayKey: string, limit: number): Promise<{ served: number; answered: number }> {
  const select = { poolCount: true, poolAnswerCount: true } as const
  const [u, a, ip] = await Promise.all([
    s.userId ? prisma.generatorDailyUsage.findUnique({ where: { userId_dayKey: { userId: s.userId, dayKey } }, select }) : null,
    !s.userId && s.anonKey
      ? prisma.generatorDailyUsage.findUnique({ where: { anonKey_dayKey: { anonKey: s.anonKey, dayKey } }, select })
      : null,
    !s.userId && s.ipHash
      ? prisma.generatorDailyUsage.findUnique({ where: { ipHash_dayKey: { ipHash: s.ipHash, dayKey } }, select })
      : null,
  ])
  if (s.userId) return { served: u?.poolCount ?? 0, answered: u?.poolAnswerCount ?? 0 }
  // Anonym: Kontingent des Geräts; die (oft geteilte) IP nur mit hoher Obergrenze.
  const hat = !!s.anonKey
  return {
    served: effektivVerbraucht(a?.poolCount ?? 0, ip?.poolCount ?? 0, serveCap(limit), hat),
    answered: effektivVerbraucht(a?.poolAnswerCount ?? 0, ip?.poolAnswerCount ?? 0, limit, hat),
  }
}

export async function getPoolQuota(s: GeneratorQuotaSubject): Promise<PoolQuotaSnapshot> {
  const limit = limitFor(s)
  if (limit < 0) return { used: 0, limit: -1, remaining: -1, serveRemaining: -1, unlimited: true }
  const { served, answered } = await readUsed(s, getGeneratorDayKey(), limit)
  return {
    used: answered,
    limit,
    remaining: Math.max(0, limit - answered),
    serveRemaining: Math.max(0, serveCap(limit) - served),
    unlimited: false,
  }
}

async function verbuchen(s: GeneratorQuotaSubject, feld: Feld, n: number): Promise<void> {
  if (n <= 0 || limitFor(s) < 0) return
  const dayKey = getGeneratorDayKey()
  const inc = { [feld]: { increment: n } }
  const ops = []
  if (s.userId) {
    ops.push(prisma.generatorDailyUsage.upsert({
      where: { userId_dayKey: { userId: s.userId, dayKey } },
      create: { userId: s.userId, dayKey, [feld]: n },
      update: inc,
    }))
  } else {
    if (s.anonKey) {
      ops.push(prisma.generatorDailyUsage.upsert({
        where: { anonKey_dayKey: { anonKey: s.anonKey, dayKey } },
        create: { anonKey: s.anonKey, dayKey, [feld]: n },
        update: inc,
      }))
    }
    if (s.ipHash) {
      ops.push(prisma.generatorDailyUsage.upsert({
        where: { ipHash_dayKey: { ipHash: s.ipHash, dayKey } },
        create: { ipHash: s.ipHash, dayKey, [feld]: n },
        update: inc,
      }))
    }
  }
  await Promise.all(ops).catch((e) => console.error("[pool-quota] Verbuchen fehlgeschlagen:", e))
}

/** Verbucht `n` ausgelieferte Poolfragen (Missbrauchsschutz). */
export async function consumePoolQuota(s: GeneratorQuotaSubject, n: number): Promise<void> {
  await verbuchen(s, "poolCount", n)
}

/** Verbucht eine im Kreuz-Modus beantwortete Frage (das eigentliche Kontingent). */
export async function consumePoolAnswer(s: GeneratorQuotaSubject): Promise<void> {
  await verbuchen(s, "poolAnswerCount", 1)
}
