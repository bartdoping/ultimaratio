import { createHmac, createHash, randomUUID, timingSafeEqual } from "crypto"
import prisma from "@/lib/db"

export const GENERATOR_FREE_DAILY_LIMIT = 3
export const GENERATOR_PRO_DAILY_LIMIT = 100
export const GENERATOR_VISITOR_COOKIE = "ur_gen_vid"

export type GeneratorQuotaSnapshot = {
  used: number
  remaining: number
  dailyLimit: number
  unlimited: boolean
  isPro: boolean
}

export type GeneratorQuotaConsumeResult =
  | ({ ok: true } & GeneratorQuotaSnapshot)
  | {
      ok: false
      limitReached: true
      used: number
      remaining: 0
      dailyLimit: number
      isPro: boolean
    }

function signingSecret(): string {
  return process.env.NEXTAUTH_SECRET || process.env.GENERATOR_LIMIT_SECRET || "dev-generator-limit-secret"
}

export function getGeneratorDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export function signVisitorId(id: string): string {
  const sig = createHmac("sha256", signingSecret()).update(id).digest("hex").slice(0, 24)
  return `${id}.${sig}`
}

export function verifyVisitorCookie(value: string | undefined): string | null {
  if (!value) return null
  const dot = value.lastIndexOf(".")
  if (dot <= 0) return null
  const id = value.slice(0, dot)
  const sig = value.slice(dot + 1)
  if (!id || !sig) return null
  const expected = createHmac("sha256", signingSecret()).update(id).digest("hex").slice(0, 24)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  return id
}

export function createVisitorId(): string {
  return randomUUID()
}

export function hashClientIp(ip: string | null | undefined): string | null {
  const trimmed = ip?.split(",")[0]?.trim()
  if (!trimmed) return null
  return createHash("sha256").update(`${signingSecret()}:${trimmed}`).digest("hex")
}

export function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null
  return req.headers.get("x-real-ip")?.trim() ?? null
}

function dailyLimit(isPro: boolean, isAdmin: boolean): number {
  if (isAdmin) return -1
  return isPro ? GENERATOR_PRO_DAILY_LIMIT : GENERATOR_FREE_DAILY_LIMIT
}

function snapshotFromUsed(
  used: number,
  limit: number,
  isPro: boolean,
  unlimited: boolean
): GeneratorQuotaSnapshot {
  if (unlimited) {
    return { used, remaining: -1, dailyLimit: -1, unlimited: true, isPro }
  }
  return {
    used,
    remaining: Math.max(0, limit - used),
    dailyLimit: limit,
    unlimited: false,
    isPro,
  }
}

async function readLoggedInUsage(userId: string, dayKey: string): Promise<number> {
  const row = await prisma.generatorDailyUsage.findUnique({
    where: { userId_dayKey: { userId, dayKey } },
    select: { count: true },
  })
  return row?.count ?? 0
}

async function readAnonymousUsage(
  anonKey: string | null,
  ipHash: string | null,
  dayKey: string
): Promise<number> {
  const [anonRow, ipRow] = await Promise.all([
    anonKey
      ? prisma.generatorDailyUsage.findUnique({
          where: { anonKey_dayKey: { anonKey, dayKey } },
          select: { count: true },
        })
      : Promise.resolve(null),
    ipHash
      ? prisma.generatorDailyUsage.findUnique({
          where: { ipHash_dayKey: { ipHash, dayKey } },
          select: { count: true },
        })
      : Promise.resolve(null),
  ])
  return Math.max(anonRow?.count ?? 0, ipRow?.count ?? 0)
}

async function readIpUsage(ipHash: string, dayKey: string): Promise<number> {
  const row = await prisma.generatorDailyUsage.findUnique({
    where: { ipHash_dayKey: { ipHash, dayKey } },
    select: { count: true },
  })
  return row?.count ?? 0
}

async function readFreeLoggedInUsage(
  userId: string,
  ipHash: string | null,
  dayKey: string
): Promise<number> {
  const userUsed = await readLoggedInUsage(userId, dayKey)
  if (!ipHash) return userUsed
  const ipUsed = await readIpUsage(ipHash, dayKey)
  return Math.max(userUsed, ipUsed)
}

export async function getGeneratorQuota(params: {
  userId?: string | null
  anonKey?: string | null
  ipHash?: string | null
  isPro: boolean
  isAdmin: boolean
}): Promise<GeneratorQuotaSnapshot> {
  const limit = dailyLimit(params.isPro, params.isAdmin)
  if (limit < 0) {
    return snapshotFromUsed(0, limit, params.isPro, true)
  }

  const dayKey = getGeneratorDayKey()
  const used = params.userId
    ? params.isPro || params.isAdmin
      ? await readLoggedInUsage(params.userId, dayKey)
      : await readFreeLoggedInUsage(params.userId, params.ipHash ?? null, dayKey)
    : await readAnonymousUsage(params.anonKey ?? null, params.ipHash ?? null, dayKey)

  return snapshotFromUsed(used, limit, params.isPro, false)
}

export type GeneratorQuotaSubject = {
  userId?: string | null
  anonKey?: string | null
  ipHash?: string | null
  isPro: boolean
  isAdmin: boolean
}

/**
 * Verbucht `units` Generierungen für das Tageskontingent.
 * - Einzelfrage = 1 unit
 * - Fallfrage mit N Teilfragen = N units
 * Schlägt fehl, wenn das verbleibende Kontingent < units ist (atomic).
 */
export async function consumeGeneratorQuota(
  params: GeneratorQuotaSubject,
  units: number = 1
): Promise<GeneratorQuotaConsumeResult> {
  const n = Math.max(1, Math.floor(units))
  const limit = dailyLimit(params.isPro, params.isAdmin)
  if (limit < 0) {
    return { ok: true, ...snapshotFromUsed(0, limit, params.isPro, true) }
  }

  const dayKey = getGeneratorDayKey()

  if (params.userId) {
    const trackIp = !params.isPro && !params.isAdmin && params.ipHash

    return prisma.$transaction(async (tx) => {
      const existing = await tx.generatorDailyUsage.findUnique({
        where: { userId_dayKey: { userId: params.userId!, dayKey } },
      })
      const ipExisting = trackIp
        ? await tx.generatorDailyUsage.findUnique({
            where: { ipHash_dayKey: { ipHash: params.ipHash!, dayKey } },
          })
        : null

      const used = trackIp
        ? Math.max(existing?.count ?? 0, ipExisting?.count ?? 0)
        : existing?.count ?? 0

      if (used + n > limit) {
        return {
          ok: false,
          limitReached: true,
          used,
          remaining: 0,
          dailyLimit: limit,
          isPro: params.isPro,
        }
      }

      const newCount = used + n

      if (existing) {
        await tx.generatorDailyUsage.update({
          where: { id: existing.id },
          data: { count: newCount },
        })
      } else {
        await tx.generatorDailyUsage.create({
          data: { userId: params.userId!, dayKey, count: newCount },
        })
      }

      if (trackIp) {
        await tx.generatorDailyUsage.upsert({
          where: { ipHash_dayKey: { ipHash: params.ipHash!, dayKey } },
          create: { ipHash: params.ipHash!, dayKey, count: newCount },
          update: { count: newCount },
        })
      }

      return {
        ok: true,
        ...snapshotFromUsed(newCount, limit, params.isPro, false),
      }
    })
  }

  if (!params.anonKey && !params.ipHash) {
    return {
      ok: false,
      limitReached: true,
      used: limit,
      remaining: 0,
      dailyLimit: limit,
      isPro: false,
    }
  }

  return prisma.$transaction(async (tx) => {
    const anonRow = params.anonKey
      ? await tx.generatorDailyUsage.findUnique({
          where: { anonKey_dayKey: { anonKey: params.anonKey!, dayKey } },
        })
      : null
    const ipRow = params.ipHash
      ? await tx.generatorDailyUsage.findUnique({
          where: { ipHash_dayKey: { ipHash: params.ipHash!, dayKey } },
        })
      : null

    const used = Math.max(anonRow?.count ?? 0, ipRow?.count ?? 0)
    if (used + n > limit) {
      return {
        ok: false,
        limitReached: true,
        used,
        remaining: 0,
        dailyLimit: limit,
        isPro: false,
      }
    }

    const newCount = used + n

    if (params.anonKey) {
      await tx.generatorDailyUsage.upsert({
        where: { anonKey_dayKey: { anonKey: params.anonKey!, dayKey } },
        create: { anonKey: params.anonKey!, dayKey, count: newCount },
        update: { count: newCount },
      })
    }
    if (params.ipHash) {
      await tx.generatorDailyUsage.upsert({
        where: { ipHash_dayKey: { ipHash: params.ipHash!, dayKey } },
        create: { ipHash: params.ipHash!, dayKey, count: newCount },
        update: { count: newCount },
      })
    }

    return {
      ok: true,
      ...snapshotFromUsed(newCount, limit, false, false),
    }
  })
}

/**
 * Compensating-Transaction: gibt `units` an verbrauchtem Kontingent zurück,
 * z. B. wenn die KI-Generierung nach erfolgter Verbuchung fehlschlägt.
 * Best-effort, niemals werfen.
 */
export async function refundGeneratorQuota(
  params: GeneratorQuotaSubject,
  units: number = 1
): Promise<void> {
  const n = Math.max(1, Math.floor(units))
  if (params.isAdmin) return
  const dayKey = getGeneratorDayKey()
  const decrement = async (where: Record<string, unknown>) => {
    try {
      const row = await prisma.generatorDailyUsage.findUnique({ where: where as never })
      if (!row) return
      const next = Math.max(0, row.count - n)
      await prisma.generatorDailyUsage.update({ where: { id: row.id }, data: { count: next } })
    } catch {
      // Refund ist best-effort – Fehler schlucken.
    }
  }

  if (params.userId) {
    await decrement({ userId_dayKey: { userId: params.userId, dayKey } })
  }
  if (params.anonKey) {
    await decrement({ anonKey_dayKey: { anonKey: params.anonKey, dayKey } })
  }
  if (params.ipHash && !params.isPro) {
    await decrement({ ipHash_dayKey: { ipHash: params.ipHash, dayKey } })
  }
}

export function visitorCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
  }
}
