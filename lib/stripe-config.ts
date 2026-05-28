/**
 * Zentrale, server-only Stripe-Konfiguration.
 *
 * Aufgaben:
 * - Stripe-Secret und Webhook-Secret liefern.
 * - Live/Test-Mode aus Key-Präfixen erkennen.
 * - Gemischte Modes (Live-Secret + Test-Price etc.) erkennen.
 * - Pro Monthly Price ID liefern – in Production zwingend gesetzt.
 *
 * Diese Datei darf NICHT in Client-Bundles importiert werden.
 */

export type StripeMode = "test" | "live" | "unknown"

export type StripeConfig = {
  /** geheimer API-Key (sk_test_… / sk_live_…). */
  secretKey: string
  /** Webhook-Signing-Secret (whsec_…). */
  webhookSecret: string | null
  /** Konfigurierter Live/Test-Pro-Monthly-Price (price_…). */
  proMonthlyPriceId: string | null
  /** Erkannter Modus anhand des Secret-Keys. */
  mode: StripeMode
  /** Erkannter Modus anhand des optionalen Publishable-Keys. */
  publishableMode: StripeMode
  /** True, wenn Test- und Live-Werte gemischt verwendet werden. */
  mixedMode: boolean
  /** Zusätzliche Warn-/Fehler-Hinweise (für Logs/Boot-Check). */
  issues: string[]
  /** Production-Umgebung (NODE_ENV === "production"). */
  isProduction: boolean
}

function detectMode(value: string | null | undefined, kind: "secret" | "publishable"): StripeMode {
  if (!value) return "unknown"
  const v = value.trim()
  if (kind === "secret") {
    if (v.startsWith("sk_live_") || v.startsWith("rk_live_")) return "live"
    if (v.startsWith("sk_test_") || v.startsWith("rk_test_")) return "test"
  } else {
    if (v.startsWith("pk_live_")) return "live"
    if (v.startsWith("pk_test_")) return "test"
  }
  return "unknown"
}

function detectPriceLooksLike(priceId: string | null | undefined): StripeMode {
  if (!priceId) return "unknown"
  // Stripe Price IDs sind seit jeher "price_…" — Mode lässt sich an der ID
  // selbst nicht zuverlässig erkennen; wir können also nur die Existenz
  // prüfen, nicht den Mode.
  return priceId.startsWith("price_") ? "unknown" : "unknown"
}

let cached: StripeConfig | null = null

/**
 * Liefert die Stripe-Konfiguration. Wird gecacht, damit Boot-Warnungen nur
 * einmal in den Logs auftauchen.
 */
export function getStripeConfig(): StripeConfig {
  if (cached) return cached

  const secretKey = (process.env.STRIPE_SECRET_KEY ?? "").trim()
  const publishableKey = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").trim()
  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim() || null
  // Bevorzugt die explizite Pro-Monthly-Variante; Legacy: STRIPE_PRICE_ID.
  const proMonthlyPriceId =
    (process.env.STRIPE_PRICE_ID_PRO_MONTHLY ?? "").trim() ||
    (process.env.STRIPE_PRICE_ID ?? "").trim() ||
    null
  const isProduction = process.env.NODE_ENV === "production"

  const mode = detectMode(secretKey, "secret")
  const publishableMode = detectMode(publishableKey, "publishable")

  const issues: string[] = []
  if (!secretKey) issues.push("STRIPE_SECRET_KEY fehlt")
  if (mode === "unknown" && secretKey)
    issues.push("STRIPE_SECRET_KEY hat kein erkennbares sk_test_/sk_live_-Präfix")
  if (!webhookSecret) issues.push("STRIPE_WEBHOOK_SECRET fehlt")

  // Gemischte Modes
  let mixedMode = false
  if (mode === "live" && publishableMode === "test") {
    mixedMode = true
    issues.push("Mixed-Mode: Live Secret Key mit Test Publishable Key")
  }
  if (mode === "test" && publishableMode === "live") {
    mixedMode = true
    issues.push("Mixed-Mode: Test Secret Key mit Live Publishable Key")
  }

  // Price-ID-Pflicht (in Prod hart, in Dev nur Warnung).
  if (!proMonthlyPriceId) {
    issues.push("STRIPE_PRICE_ID_PRO_MONTHLY (bzw. STRIPE_PRICE_ID) fehlt")
  }

  // Optional: Price-Mode lässt sich nicht zuverlässig aus der ID lesen.
  // Hier bewusst kein Hartfehler.
  void detectPriceLooksLike(proMonthlyPriceId)

  cached = {
    secretKey,
    webhookSecret,
    proMonthlyPriceId,
    mode,
    publishableMode,
    mixedMode,
    issues,
    isProduction,
  }

  // Boot-Logs (einmalig). In Prod: harte Fehler bei kritischen Issues.
  if (issues.length > 0) {
    const level = isProduction ? "error" : "warn"
    const logger = level === "error" ? console.error : console.warn
    logger("[stripe-config]", { mode, publishableMode, mixedMode, issues })
  }

  return cached
}

/** Test-Hook: leert den internen Cache (nur für Unit-Tests). */
export function __resetStripeConfigCache(): void {
  cached = null
}

/**
 * Wirft, wenn die Konfiguration in Production zu unsicher für Live-Betrieb
 * ist. Aufruf in produktiven Code-Pfaden (Checkout, Customer-Portal).
 */
export function assertStripeReadyForCharges(): StripeConfig {
  const cfg = getStripeConfig()
  if (!cfg.secretKey) {
    throw new StripeConfigError("STRIPE_SECRET_KEY fehlt")
  }
  if (!cfg.proMonthlyPriceId) {
    throw new StripeConfigError(
      "Stripe Pro-Preis nicht konfiguriert (STRIPE_PRICE_ID_PRO_MONTHLY)"
    )
  }
  if (cfg.isProduction) {
    if (cfg.mode !== "live") {
      throw new StripeConfigError(
        "Stripe ist in Production nicht im Live-Mode (STRIPE_SECRET_KEY ist kein sk_live_…)"
      )
    }
    if (!cfg.webhookSecret) {
      throw new StripeConfigError("STRIPE_WEBHOOK_SECRET fehlt in Production")
    }
    if (cfg.mixedMode) {
      throw new StripeConfigError("Stripe-Konfiguration mischt Test- und Live-Werte")
    }
  }
  return cfg
}

export class StripeConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "StripeConfigError"
  }
}
