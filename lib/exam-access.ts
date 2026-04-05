import type { Role, SubscriptionStatus } from "@prisma/client"

export function isProOrAdmin(role: Role, subscriptionStatus: SubscriptionStatus): boolean {
  return role === "admin" || subscriptionStatus === "pro"
}

/** Zugriff auf Prüfungsinhalt (Start, Detailseite, Practice): Pro/Admin oder markiertes Probedeck. */
export function hasExamLearningAccess(
  role: Role,
  subscriptionStatus: SubscriptionStatus,
  examIsFreeTrialDemo: boolean
): boolean {
  if (isProOrAdmin(role, subscriptionStatus)) return true
  return examIsFreeTrialDemo
}

/** Promo-Bereiche (Homepage, /exams, Dashboard) nur für Nicht-Pro (ohne Admin). */
export function showFreeTrialExamPromo(role: Role, subscriptionStatus: SubscriptionStatus): boolean {
  return !isProOrAdmin(role, subscriptionStatus)
}
