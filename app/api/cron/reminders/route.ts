import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getGeneratorDayKey } from "@/lib/generator-limits"
import { getAppBaseUrl } from "@/lib/app-base-url"
import { reminderMail, reminderReason } from "@/lib/reminders"
import { track } from "@/lib/product-events"

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

  for (;;) {
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

    for (const u of users) {
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
      if (!reason) continue
      const mail = reminderMail(reason, {
        app: `${base}/kreuzen`,
        unsubscribe: `${base}/api/reminders/unsubscribe?t=${encodeURIComponent(u.reminderToken!)}`,
      })
      try {
        await sendMail({ to: u.email, ...mail })
        await prisma.user.update({ where: { id: u.id }, data: { lastReminderAt: now } })
        track("reminder_sent", { userId: u.id, props: { kind: reason.kind } })
        gesendet++
      } catch {
        // Einzelner Fehlschlag stoppt den Lauf nicht.
      }
    }
    if (users.length < BATCH) break
  }

  return NextResponse.json({ ok: true, geprueft, gesendet })
}
