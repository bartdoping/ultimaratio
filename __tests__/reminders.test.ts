import { describe, expect, it } from "vitest"
import { previousDayKey, reminderMail, reminderReason, type ReminderInput } from "@/lib/reminders"

const basis: ReminderInput = {
  optIn: true,
  lastReminderAt: null,
  lastActiveDayKey: "2026-10-22",
  todayKey: "2026-10-23",
  currentStreak: 5,
  dueCount: 0,
  now: new Date("2026-10-23T17:00:00Z"),
}

describe("reminderReason", () => {
  it("ohne Einwilligung nie", () => {
    expect(reminderReason({ ...basis, optIn: false })).toBeNull()
  })

  it("heute schon aktiv → keine Mail", () => {
    expect(reminderReason({ ...basis, lastActiveDayKey: "2026-10-23" })).toBeNull()
  })

  it("Streak in Gefahr, wenn gestern aktiv war", () => {
    expect(reminderReason(basis)).toEqual({ kind: "streak", streak: 5, dueCount: 0 })
  })

  it("gerissener Streak löst keine Streak-Mail aus", () => {
    expect(reminderReason({ ...basis, lastActiveDayKey: "2026-10-20" })).toBeNull()
  })

  it("fällige Wiederholungen ab 3", () => {
    expect(reminderReason({ ...basis, currentStreak: 0, lastActiveDayKey: "2026-10-10", dueCount: 3 })).toEqual({
      kind: "due",
      dueCount: 3,
    })
    expect(reminderReason({ ...basis, currentStreak: 0, lastActiveDayKey: "2026-10-10", dueCount: 2 })).toBeNull()
  })

  it("höchstens eine Mail in 20 Stunden", () => {
    expect(reminderReason({ ...basis, lastReminderAt: new Date("2026-10-23T05:00:00Z") })).toBeNull()
    expect(reminderReason({ ...basis, lastReminderAt: new Date("2026-10-22T17:00:00Z") })).not.toBeNull()
  })
})

describe("previousDayKey", () => {
  it("über Monatsgrenzen", () => {
    expect(previousDayKey("2026-11-01")).toBe("2026-10-31")
    expect(previousDayKey("2026-01-01")).toBe("2025-12-31")
  })
})

describe("reminderMail", () => {
  it("enthält Abmeldelink und escaped", () => {
    const m = reminderMail({ kind: "due", dueCount: 7 }, { app: "https://x.de/kreuzen", unsubscribe: "https://x.de/u?t=a&b" })
    expect(m.subject).toContain("7")
    expect(m.text).toContain("https://x.de/u?t=a&b")
    expect(m.html).toContain("https://x.de/u?t=a&amp;b")
  })
})
