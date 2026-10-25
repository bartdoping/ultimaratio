import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { assertSameOrigin } from "@/lib/security"
import { quotaSubjectFromAccess, resolveGeneratorAccess } from "@/lib/generator-access"
import {
  getGeneratorQuota,
  signVisitorId,
  GENERATOR_VISITOR_COOKIE,
  visitorCookieOptions,
} from "@/lib/generator-limits"
import { consumePoolQuota, getPoolQuota } from "@/lib/pool-quota"
import { markServed, pickFromPool } from "@/lib/pool"
import { generateIntoPool } from "@/lib/pool-generate"
import { poolRefillAllowed } from "@/lib/pool-refill"
import { sendOpsAlert } from "@/lib/ops-alert"
import { generatableTopics, isLearnPlanId, LEARN_PLANS } from "@/lib/learn-plans"
import { payloadToQuestion, themenBilanz } from "@/lib/saved-questions"
import { shuffleOptions } from "@/lib/option-order"
import { track } from "@/lib/product-events"
import { GENERATOR_TOPIC_MAX } from "@/lib/generator-ai-config"
import type { GeneratorSection } from "@/lib/generator-section"
import type { KreuzenItem, KreuzenNextResponse } from "@/lib/kreuzen-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Eine Neugenerierung dauert 15–40 s; der Browser wartet darauf nicht sichtbar,
// er beantwortet währenddessen Fragen aus seinem Puffer.
export const maxDuration = 120

const MAX_PRO_ABRUF = 5

/**
 * POST /api/kreuzen/next — die nächsten Fragen für den Kreuz-Strom.
 *
 * Reihenfolge der Quellen:
 *  1. Fällige Wiederholungen (nur angemeldet; `dueSlots` steuert, wie viele
 *     in diesen Abruf gemischt werden — der Browser legt jede 4. Frage fest).
 *  2. Ungesehene Poolfragen zu Thema(en) und Stufe — sofort, billig.
 *  3. Erst wenn der Pool leer ist: EINE Neugenerierung, die danach im Pool
 *     liegt und allen anderen auch zur Verfügung steht.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
  } catch {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const difficulty = Math.min(5, Math.max(1, Math.round(Number(body.difficulty) || 3)))
  const count = Math.min(MAX_PRO_ABRUF, Math.max(1, Math.round(Number(body.count) || 3)))
  const dueSlots = Math.min(count, Math.max(0, Math.round(Number(body.dueSlots) || 0)))
  const allowGenerate = body.allowGenerate !== false
  const exclude = Array.isArray(body.exclude) ? (body.exclude as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 500) : []
  const excludePool = exclude.filter((k) => k.startsWith("p:")).map((k) => k.slice(2))
  const excludeSaved = exclude.filter((k) => k.startsWith("s:")).map((k) => k.slice(2))
  const source = (body.source ?? {}) as Record<string, unknown>
  // Fragen, die der Browser schon vorrätig hat und noch nicht beantwortet sind.
  const vorrat = Math.min(50, Math.max(0, Math.round(Number(body.vorrat) || 0)))

  const access = await resolveGeneratorAccess(req)
  const subject = quotaSubjectFromAccess(access)
  const userId = access.user?.id ?? null

  // ---- Themen bestimmen ----
  let topics: string[] = []
  let section: GeneratorSection = "auto"
  if (source.type === "topic") {
    const t = String(source.topic ?? "").trim().slice(0, GENERATOR_TOPIC_MAX)
    if (t.length >= 3) topics = [t]
  } else if (source.type === "plan" && isLearnPlanId(source.planId)) {
    topics = generatableTopics(source.planId, Math.round(Number(source.day) || 1))
    section = LEARN_PLANS[source.planId].section
  } else if (source.type === "weak" && userId) {
    const rows = await prisma.savedQuestion.findMany({
      where: { userId, attempts: { gt: 0 } },
      select: { topic: true, attempts: true, correctCount: true },
      take: 2000,
    })
    // Die drei schwächsten Themen — dort lohnt jede weitere Frage am meisten.
    topics = themenBilanz(rows).slice(0, 3).map((t) => t.topic)
  }

  const items: KreuzenItem[] = []
  let grenze: Extract<KreuzenNextResponse, { ok: true }>["grenze"] = null

  // ---- 1. Fällige Wiederholungen ----
  const dueWanted = source.type === "due" ? count : dueSlots
  if (userId && dueWanted > 0) {
    const due = await prisma.savedQuestion.findMany({
      where: { userId, dueAt: { lte: new Date() }, id: { notIn: excludeSaved }, mode: "single" },
      orderBy: { dueAt: "asc" },
      take: dueWanted,
    })
    for (const d of due) {
      const q = payloadToQuestion(d.payload)
      if (!q) continue
      items.push({
        key: `s:${d.id}`,
        kind: "due",
        poolQuestionId: d.poolQuestionId,
        savedId: d.id,
        topic: d.topic,
        difficulty: d.difficulty,
        section: (d.section as GeneratorSection) ?? "auto",
        question: shuffleOptions(q),
      })
    }
  }
  if (source.type === "due") {
    if (items.length === 0) grenze = "keine_themen"
  } else if (topics.length === 0) {
    grenze = "keine_themen"
  }

  // ---- 2. Pool ----
  const poolQuota = await getPoolQuota(subject)
  const poolUnlimited = poolQuota.unlimited
  // Beantwortbar ist, was das Kontingent hergibt, abzüglich des schon
  // gepufferten Vorrats; ausgeliefert höchstens bis zur Missbrauchsgrenze.
  let poolRemaining = poolUnlimited ? -1 : Math.max(0, Math.min(poolQuota.remaining - vorrat, poolQuota.serveRemaining))
  if (source.type !== "due" && topics.length > 0) {
    const need = count - items.length
    const erlaubt = poolUnlimited ? need : Math.min(need, poolRemaining)
    if (erlaubt < need) grenze = "pool_limit"
    if (erlaubt > 0) {
      const ausPool = await pickFromPool({ topics, difficulty, limit: erlaubt, excludeIds: excludePool, userId })
      for (const s of ausPool) {
        items.push({ key: `p:${s.poolQuestionId}`, kind: "pool", poolQuestionId: s.poolQuestionId, savedId: null, topic: s.topic, difficulty: s.difficulty, section: s.section !== "auto" ? s.section : section, question: s.question })
      }
      if (ausPool.length > 0) {
        await consumePoolQuota(subject, ausPool.length)
        if (!poolUnlimited) poolRemaining = Math.max(0, poolRemaining - ausPool.length)
      }
    }
  }

  // ---- 3. Neugenerierung, nur wenn der Pool nichts mehr hat ----
  const poolLeer = source.type !== "due" && topics.length > 0 && items.filter((i) => i.kind === "pool").length === 0
  // Zählt NICHT gegen das Generator-Kontingent, sondern als eine Frage des
  // Kreuz-Kontingents (siehe lib/pool-refill.ts).
  const kreuzKontingentFrei = poolUnlimited || poolRemaining > 0
  if (poolLeer && allowGenerate && grenze !== "pool_limit" && kreuzKontingentFrei) {
    const freigabe = await poolRefillAllowed({ userId, isPro: access.isPro })
    if (!freigabe.ok) {
      grenze = freigabe.grund
      if (freigabe.global) sendOpsAlert("kreuzen_cap", `Tagesgrenze für Neugenerierungen im Kreuz-Modus erreicht (KREUZEN_GEN_DAILY_CAP).`)
    } else {
      const topic = topics[Math.floor(Math.random() * topics.length)]
      const abort = new AbortController()
      const timer = setTimeout(() => abort.abort(), 110_000)
      // Vor dem Aufruf zählen: Auch ein gescheiterter Versuch kostet Guthaben.
      track("generation_requested", { userId, props: { mode: "single", units: 1, difficulty, section, via: "kreuzen" } })
      try {
        const neu = await generateIntoPool({ topic, difficulty, section, userId, signal: abort.signal })
        if (neu) {
          items.push({ key: `p:${neu.poolQuestionId}`, kind: "pool", poolQuestionId: neu.poolQuestionId, savedId: null, topic: neu.topic, difficulty: neu.difficulty, section: neu.section, question: neu.question })
          await consumePoolQuota(subject, 1)
          if (!poolUnlimited) poolRemaining = Math.max(0, poolRemaining - 1)
        } else {
          grenze = "generierung_fehlgeschlagen"
          track("generation_failed", { userId, props: { mode: "single", via: "kreuzen" } })
        }
      } catch (e) {
        grenze = "generierung_fehlgeschlagen"
        track("generation_failed", { userId, props: { mode: "single", via: "kreuzen" } })
        console.error("[kreuzen] Generierung fehlgeschlagen:", (e as Error)?.message)
      } finally {
        clearTimeout(timer)
      }
    }
  }

  // ---- Buchführung ----
  const poolIds = items.filter((i) => i.kind === "pool" && i.poolQuestionId).map((i) => i.poolQuestionId!)
  await markServed(poolIds, userId)
  for (const it of items) {
    track("question_served", { userId, props: { kind: it.kind, difficulty: it.difficulty, quelle: String(source.type ?? "") } })
  }

  const gen = await getGeneratorQuota(subject)
  const res = NextResponse.json(
    {
      ok: true,
      items,
      grenze,
      quota: {
        pool: { remaining: poolUnlimited ? -1 : poolRemaining, unlimited: poolUnlimited },
        gen: { remaining: gen.remaining, unlimited: gen.unlimited },
      },
      isLoggedIn: access.isLoggedIn,
      isPro: access.isPro,
    } satisfies KreuzenNextResponse,
    { headers: { "Cache-Control": "no-store" } }
  )
  if (access.newVisitorId) {
    res.cookies.set(GENERATOR_VISITOR_COOKIE, signVisitorId(access.newVisitorId), visitorCookieOptions())
  }
  return res
}
