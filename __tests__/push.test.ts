import { describe, expect, it, vi } from "vitest"
vi.mock("@/lib/db", () => ({ default: { pushSubscription: { findMany: vi.fn(async () => []) } } }))
vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() } }))
import { pushConfigured, pushPayload, sendPushToUser } from "@/lib/push"

describe("push", () => {
  it("ohne VAPID-Schlüssel abgeschaltet — nichts wird gesendet", async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    delete process.env.VAPID_PRIVATE_KEY
    expect(pushConfigured()).toBe(false)
    expect(await sendPushToUser("u1", { title: "t", body: "b", url: "/kreuzen" })).toBe(0)
  })

  it("kürzt Titel und Text für den Sperrbildschirm", () => {
    const p = JSON.parse(pushPayload({ title: "x".repeat(200), body: "y".repeat(400), url: "/kreuzen" }))
    expect(p.title).toHaveLength(80)
    expect(p.body).toHaveLength(160)
    expect(p.url).toBe("/kreuzen")
    expect(p.tag).toBe("fragenkreuzen")
  })
})
