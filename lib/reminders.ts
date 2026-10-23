/**
 * Lern-Erinnerungen per E-Mail — nur mit ausdrücklicher Einwilligung.
 *
 * Höchstens eine Mail pro Tag und nur mit konkretem Anlass: Wiederholungen
 * sind fällig oder ein Streak würde heute reißen. Wer heute schon gekreuzt
 * hat, bekommt nichts. Eine Erinnerung ohne Anlass wäre Spam und würde
 * abbestellt — dann ist der Kanal für immer weg.
 */

export type ReminderInput = {
  optIn: boolean
  /** Letzte Erinnerung oder null. */
  lastReminderAt: Date | null
  /** Tag der letzten Aktivität (YYYY-MM-DD, Europe/Berlin) oder null. */
  lastActiveDayKey: string | null
  todayKey: string
  currentStreak: number
  dueCount: number
  now: Date
}

export type ReminderReason =
  | { kind: "streak"; streak: number; dueCount: number }
  | { kind: "due"; dueCount: number }

/** Mindestabstand zwischen zwei Erinnerungen. */
export const REMINDER_MIN_GAP_MS = 20 * 60 * 60 * 1000

export function reminderReason(i: ReminderInput): ReminderReason | null {
  if (!i.optIn) return null
  if (i.lastActiveDayKey === i.todayKey) return null
  if (i.lastReminderAt && i.now.getTime() - i.lastReminderAt.getTime() < REMINDER_MIN_GAP_MS) return null
  // Streak läuft nur weiter, wenn gestern aktiv war — sonst ist er schon gerissen.
  if (i.currentStreak >= 2 && i.lastActiveDayKey === previousDayKey(i.todayKey)) {
    return { kind: "streak", streak: i.currentStreak, dueCount: i.dueCount }
  }
  if (i.dueCount >= 3) return { kind: "due", dueCount: i.dueCount }
  return null
}

export function previousDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map((x) => parseInt(x, 10))
  if (!y || !m || !d) return ""
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - 1)
  return dt.toISOString().slice(0, 10)
}

export function reminderMail(
  reason: ReminderReason,
  links: { app: string; unsubscribe: string }
): { subject: string; text: string; html: string } {
  const subject =
    reason.kind === "streak"
      ? `Dein ${reason.streak}-Tage-Streak endet heute um Mitternacht`
      : `${reason.dueCount} Fragen warten auf deine Wiederholung`
  const zeile =
    reason.kind === "streak"
      ? `Eine Frage reicht, um deinen Streak von ${reason.streak} Tagen zu halten.${reason.dueCount > 0 ? ` ${reason.dueCount} Wiederholungen sind fällig.` : ""}`
      : `Genau jetzt ist der beste Zeitpunkt — kurz bevor du sie vergisst. Dauert ein paar Minuten.`
  const text = [zeile, "", `Weiterkreuzen: ${links.app}`, "", `Keine Erinnerungen mehr: ${links.unsubscribe}`].join("\n")
  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
  <p style="font-size:16px;line-height:1.5;margin:0 0 20px">${escapeHtml(zeile)}</p>
  <a href="${escapeHtml(links.app)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">Weiterkreuzen</a>
  <p style="font-size:12px;color:#777;margin:28px 0 0">Du bekommst diese Mail, weil du Lern-Erinnerungen eingeschaltet hast.
  <a href="${escapeHtml(links.unsubscribe)}" style="color:#777">Erinnerungen abbestellen</a></p>
</div>`
  return { subject, text, html }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!)
}
