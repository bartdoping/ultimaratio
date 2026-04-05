import type { Role, SubscriptionStatus } from "@prisma/client"

export function isProOrAdmin(role: Role, subscriptionStatus: SubscriptionStatus): boolean {
  return role === "admin" || subscriptionStatus === "pro"
}

/**
 * Zugriff auf Prüfungsinhalt (Start, Detailseite, Practice):
 * Pro/Admin, einzeln gekauft (Purchase), oder kostenloses Probedeck.
 */
export function hasExamLearningAccess(
  role: Role,
  subscriptionStatus: SubscriptionStatus,
  examIsFreeTrialDemo: boolean,
  hasPurchasedThisExam = false
): boolean {
  if (isProOrAdmin(role, subscriptionStatus)) return true
  if (hasPurchasedThisExam) return true
  return examIsFreeTrialDemo
}

/** Promo-Bereiche (Homepage, /exams, Dashboard) nur für Nicht-Pro (ohne Admin). */
export function showFreeTrialExamPromo(role: Role, subscriptionStatus: SubscriptionStatus): boolean {
  return !isProOrAdmin(role, subscriptionStatus)
}
