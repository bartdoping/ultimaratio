// lib/scoring.ts
export function computeScore(totalQuestions: number, correct: number, passPercent: number) {
    const total = Math.max(0, totalQuestions | 0)
    const right = Math.max(0, correct | 0)
    const scorePercent = total > 0 ? Math.round((right / total) * 100) : 0
    const passed = scorePercent >= passPercent
    return { scorePercent, passed }
  }
  