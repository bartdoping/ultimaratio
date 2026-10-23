import prisma from "@/lib/db"
import { getGeneratorDayKey } from "@/lib/generator-limits"
import type { GeneratorQuotaSubject } from "@/lib/generator-limits"

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

export type PoolQuotaSnapshot = { used: number; limit: number; remaining: number; unlimited: boolean }

function limitFor(s: GeneratorQuotaSubject): number {
  if (s.isPro || s.isAdmin) return -1
  return s.userId ? POOL_LIMIT_FREE : POOL_LIMIT_ANON
}

async function readUsed(s: GeneratorQuotaSubject, dayKey: string): Promise<number> {
  const [u, a, ip] = await Promise.all([
    s.userId
      ? prisma.generatorDailyUsage.findUnique({ where: { userId_dayKey: { userId: s.userId, dayKey } }, select: { poolCount: true } })
      : null,
    !s.userId && s.anonKey
      ? prisma.generatorDailyUsage.findUnique({ where: { anonKey_dayKey: { anonKey: s.anonKey, dayKey } }, select: { poolCount: true } })
      : null,
    !s.userId && s.ipHash
      ? prisma.generatorDailyUsage.findUnique({ where: { ipHash_dayKey: { ipHash: s.ipHash, dayKey } }, select: { poolCount: true } })
      : null,
  ])
  // Anonym zählt das Maximum aus Cookie und IP — Cookie löschen setzt das
  // Kontingent nicht zurück.
  return Math.max(u?.poolCount ?? 0, a?.poolCount ?? 0, ip?.poolCount ?? 0)
}

export async function getPoolQuota(s: GeneratorQuotaSubject): Promise<PoolQuotaSnapshot> {
  const limit = limitFor(s)
  if (limit < 0) return { used: 0, limit: -1, remaining: -1, unlimited: true }
  const used = await readUsed(s, getGeneratorDayKey())
  return { used, limit, remaining: Math.max(0, limit - used), unlimited: false }
}

/** Verbucht `n` ausgelieferte Poolfragen. */
export async function consumePoolQuota(s: GeneratorQuotaSubject, n: number): Promise<void> {
  if (n <= 0 || limitFor(s) < 0) return
  const dayKey = getGeneratorDayKey()
  const inc = { poolCount: { increment: n } }
  const ops = []
  if (s.userId) {
    ops.push(prisma.generatorDailyUsage.upsert({
      where: { userId_dayKey: { userId: s.userId, dayKey } },
      create: { userId: s.userId, dayKey, poolCount: n },
      update: inc,
    }))
  } else {
    if (s.anonKey) {
      ops.push(prisma.generatorDailyUsage.upsert({
        where: { anonKey_dayKey: { anonKey: s.anonKey, dayKey } },
        create: { anonKey: s.anonKey, dayKey, poolCount: n },
        update: inc,
      }))
    }
    if (s.ipHash) {
      ops.push(prisma.generatorDailyUsage.upsert({
        where: { ipHash_dayKey: { ipHash: s.ipHash, dayKey } },
        create: { ipHash: s.ipHash, dayKey, poolCount: n },
        update: inc,
      }))
    }
  }
  await Promise.all(ops).catch((e) => console.error("[pool-quota] Verbuchen fehlgeschlagen:", e))
}
