import { formatSeconds } from "../lib/time"

describe("formatSeconds", () => {
  it("formats mm:ss", () => {
    expect(formatSeconds(0)).toBe("00:00")
    expect(formatSeconds(5)).toBe("00:05")
    expect(formatSeconds(65)).toBe("01:05")
  })
  it("formats hh:mm:ss when needed", () => {
    expect(formatSeconds(3661)).toBe("01:01:01")
  })
})
