import { computeScore } from "../lib/scoring"

describe("computeScore", () => {
  it("handles zero questions", () => {
    expect(computeScore(0, 0, 60)).toEqual({ scorePercent: 0, passed: false })
  })
  it("rounds correctly and applies pass threshold", () => {
    expect(computeScore(10, 6, 60)).toEqual({ scorePercent: 60, passed: true })
    expect(computeScore(10, 5, 60)).toEqual({ scorePercent: 50, passed: false })
  })
  it("scores partial attempts by their selected question count", () => {
    expect(computeScore(7, 5, 70)).toEqual({ scorePercent: 71, passed: true })
    expect(computeScore(7, 4, 70)).toEqual({ scorePercent: 57, passed: false })
  })
})
