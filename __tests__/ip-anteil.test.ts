import { describe, expect, it } from "vitest"
import { effektivVerbraucht, IP_FAKTOR } from "@/lib/ip-anteil"

const LIMIT = 10
const rest = (eigen: number, ip: number, hat = true) => LIMIT - effektivVerbraucht(eigen, ip, LIMIT, hat)

describe("geteilte IP (Uni-WLAN, Mobilfunk)", () => {
  it("ein neues Gerät hat sein volles Kontingent, auch wenn andere an derselben IP schon kreuzen", () => {
    // 15 Leute im Hörsaal haben je 10 Fragen gekreuzt → IP steht bei 150.
    expect(rest(0, 150)).toBe(10)
  })
  it("das eigene Kontingent zählt", () => {
    expect(rest(7, 150)).toBe(3)
    expect(rest(10, 10)).toBe(0)
  })
  it("die IP-Obergrenze greift erst beim IP_FAKTOR-fachen", () => {
    expect(rest(0, LIMIT * IP_FAKTOR - 4)).toBe(4)
    expect(rest(0, LIMIT * IP_FAKTOR)).toBe(0)
  })
  it("ohne Cookie zählt die IP wie früher", () => {
    expect(rest(0, 6, false)).toBe(4)
  })
  it("nie negativ", () => {
    expect(effektivVerbraucht(0, 0, LIMIT, true)).toBe(0)
  })
})
