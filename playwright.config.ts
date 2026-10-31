import { defineConfig, devices } from "@playwright/test"
import { loadEnvConfig } from "@next/env"

/**
 * Browser-Tests: echte Klickwege gegen einen lokalen Dev-Server auf Port 3100.
 *
 * Sicherheitsnetz: läuft nur gegen die Dev-Datenbank und Stripe im Testmodus,
 * verschickt keine Mails (E2E=1) und kann kein KI-Guthaben verbrauchen
 * (leerer OPENAI_API_KEY; der Abschlusscheck schlägt sonst Alarm).
 */
loadEnvConfig(process.cwd(), true)

const url = process.env.DATABASE_URL ?? ""
if (url.includes("ep-snowy-math")) throw new Error("E2E: DATABASE_URL zeigt auf Production — Abbruch.")
if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith("sk_test")) {
  throw new Error("E2E: Kein Stripe-Testschlüssel — Abbruch.")
}

const PORT = 3100
export const E2E_BASE = `http://localhost:${PORT}`
// Nur für signierte Test-Webhooks gegen den lokalen Server.
process.env.STRIPE_WEBHOOK_SECRET = "whsec_e2e_lokal"

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  // Der Dev-Server kompiliert jede Seite beim ersten Aufruf.
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: E2E_BASE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobil", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `${E2E_BASE}/api/health`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      E2E: "1",
      OPENAI_API_KEY: "",
      KREUZEN_GEN_DAILY_CAP: "0",
      STRIPE_WEBHOOK_SECRET: "whsec_e2e_lokal",
      NEXTAUTH_URL: E2E_BASE,
      NEXT_PUBLIC_APP_URL: E2E_BASE,
      NEXT_PUBLIC_SENTRY_DSN: process.env.E2E_SENTRY_DSN ?? "",
    },
  },
})
