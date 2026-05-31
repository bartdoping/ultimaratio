/** Pfade, die im Generator-Fokus-Modus (Nicht-Admin) erreichbar bleiben. */

const EXACT_PATHS = new Set([
  "/",
  "/generator",
  "/coming-soon",
  "/login",
  "/register",
  "/verify",
  "/forgot-password",
  "/reset",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/widerruf",
  "/account",
  "/subscription",
])

const PREFIX_PATHS = [
  "/_next",
  "/favicon",
  "/media/",
  "/api/auth",
  "/api/account/",
  "/api/ai/generate-questions",
  "/api/labs",
  "/api/stripe/webhook",
  "/api/stripe/customer-portal",
  "/api/stripe/subscription/",
  "/api/subscription/",
]

export function isAdminRole(role: string | undefined | null): boolean {
  return role === "admin"
}

export function isGeneratorModePathAllowed(pathname: string): boolean {
  if (EXACT_PATHS.has(pathname)) return true
  return PREFIX_PATHS.some((prefix) => pathname.startsWith(prefix))
}

export const UPCOMING_FEATURES = [
  {
    title: "Prüfungsfragen & Probedeck",
    description: "Realistische Single-Choice-Fragen, Fallvignetten und kostenloses Probedeck im echten Prüfungsmodus.",
    icon: "📚",
  },
  {
    title: "Prüfungs- & Übungsmodus",
    description: "Timer, Laborwerte, Bilder und Auswertung – wie in der echten Prüfung.",
    icon: "⏱️",
  },
  {
    title: "Eigene Decks",
    description: "Baue persönliche Fragesammlungen und wiederhole gezielt deine Schwächen.",
    icon: "🗂️",
  },
  {
    title: "Spaced Repetition",
    description: "Intelligente Wiederholung für langfristiges Behalten – automatisch und effizient.",
    icon: "🧠",
  },
  {
    title: "Dashboard & Statistiken",
    description: "Fortschritt, Historie und detaillierte Auswertungen auf einen Blick.",
    icon: "📊",
  },
  {
    title: "Vollständige Fragenbank",
    description: "Zugriff auf alle Prüfungen – mit Pro oder als Einzelkauf.",
    icon: "🎓",
  },
] as const
