import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getGeneratorDayKey } from "@/lib/generator-limits"
import { getAppBaseUrl } from "@/lib/app-base-url"
import { reminderMail, reminderReason } from "@/lib/reminders"
import { track } from "@/lib/product-events"
import { sendPushToUser } from "@/lib/push"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const BATCH = 200

/**
 * GET /api/cron/reminders — tägliche Lern-Erinnerungen (Vercel Cron).
 *
 * Geschützt über CRON_SECRET (Vercel sendet es als Bearer-Token). Ohne
 * gesetztes Secret ist der Endpunkt abgeschaltet.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const { sendMail } = await import("@/lib/mail")
  const now = new Date()
  const todayKey = getGeneratorDayKey(now)
  const base = getAppBaseUrl()
  let cursor: string | undefined
  let gesendet = 0
  let geprueft = 0
  let fehler = 0
  let unvollstaendig = false
  const start = Date.now()
  // Zeitbudget unter maxDuration (300 s): rechtzeitig aufhören und protokollieren,
  // statt hart abgebrochen zu werden.
  const BUDGET_MS = 240_000
  const PARALLEL = 8

  type Kandidat = {
    id: string
    email: string
    reminderToken: string | null
    lastReminderAt: Date | null
    streak: { currentStreak: number; lastActiveDayKey: string | null } | null
  }

  async function bearbeite(u: Kandidat) {
    geprueft++
    const dueCount = await prisma.savedQuestion.count({ where: { userId: u.id, mode: "single", dueAt: { lte: now } } })
    const reason = reminderReason({
      optIn: true,
      lastReminderAt: u.lastReminderAt,
      lastActiveDayKey: u.streak?.lastActiveDayKey ?? null,
      todayKey,
      currentStreak: u.streak?.currentStreak ?? 0,
      dueCount,
      now,
    })
    if (!reason) return
    const mail = reminderMail(reason, {
      app: `${base}/kreuzen`,
      unsubscribe: `${base}/api/reminders/unsubscribe?t=${encodeURIComponent(u.reminderToken!)}`,
    })
    try {
      // Zuerst aufs Handy; nur wenn kein Gerät erreichbar ist, per Mail.
      const perPush = await sendPushToUser(u.id, {
        title: reason.kind === "streak" ? `🔥 ${reason.streak} Tage — nicht abreißen lassen` : "Deine Wiederholungen warten",
        body: mail.subject,
        url: "/kreuzen",
        tag: "erinnerung",
      }).catch(() => 0)
      if (perPush === 0) await sendMail({ to: u.email, ...mail })
      await prisma.user.update({ where: { id: u.id }, data: { lastReminderAt: now } })
      track("reminder_sent", { userId: u.id, props: { kind: reason.kind, kanal: perPush > 0 ? "push" : "mail" } })
      gesendet++
    } catch {
      // Einzelner Fehlschlag stoppt den Lauf nicht.
      fehler++
    }
  }

  outer: for (;;) {
    const users = await prisma.user.findMany({
      where: { reminderOptIn: true, reminderToken: { not: null }, emailVerifiedAt: { not: null } },
      select: {
        id: true,
        email: true,
        reminderToken: true,
        lastReminderAt: true,
        streak: { select: { currentStreak: true, lastActiveDayKey: true } },
      },
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
    if (users.length === 0) break
    cursor = users[users.length - 1].id

    for (let i = 0; i < users.length; i += PARALLEL) {
      if (Date.now() - start > BUDGET_MS) {
        unvollstaendig = true
        break outer
      }
      await Promise.all(users.slice(i, i + PARALLEL).map(bearbeite))
    }
    if (users.length < BATCH) break
  }

  track("cron_run", {
    props: { job: "reminders", geprueft, gesendet, fehler, ms: Date.now() - start, unvollstaendig },
  })
  return NextResponse.json({ ok: true, geprueft, gesendet, fehler, unvollstaendig })
}
