import { computeScore } from "../lib/scoring"

describe("computeScore", () => {
  it("handles zero questions", () => {
    expect(computeScore(0, 0, 60)).toEqual({ scorePercent: 0, passed: false })
  })
  it("rounds correctly and applies pass threshold", () => {
    expect(computeScore(10, 6, 60)).toEqual({ scorePercent: 60, passed: true })
    expect(computeScore(10, 5, 60)).toEqual({ scorePercent: 50, passed: false })
  })
})
