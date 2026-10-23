import { describe, expect, it, vi } from "vitest"
vi.mock("@/lib/db", () => ({ default: {} }))
import { sessionsToEvict } from "@/lib/user-sessions"

describe("sessionsToEvict", () => {
  const s = (id: string, t: number) => ({ id, lastSeenAt: new Date(t) })

  it("behält die zwei jüngsten", () => {
    expect(sessionsToEvict([s("a", 1), s("b", 3), s("c", 2)])).toEqual(["a"])
  })

  it("nichts zu tun bis zur Grenze", () => {
    expect(sessionsToEvict([s("a", 1), s("b", 2)])).toEqual([])
  })

  it("mehrere alte auf einmal", () => {
    expect(sessionsToEvict([s("a", 1), s("b", 2), s("c", 3), s("d", 4)]).sort()).toEqual(["a", "b"])
  })
})
