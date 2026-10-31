import { expect, test } from "@playwright/test"
import { einloggen, kontoAnlegen } from "./helpers"

const SEITEN: [string, RegExp][] = [
  ["/admin/system", /Systemstatus/],
  ["/admin/stripe", /Stripe-Abgleich/],
  ["/admin/nutzer", /Nutzer/],
  ["/admin/meldungen", /Gemeldete Fragen/],
  ["/admin/metrics", /./],
]

test("Admin-Seiten laden ohne Fehlerseite", async ({ page }) => {
  const k = await kontoAnlegen("admin")
  await einloggen(page, k.email, k.passwort)
  for (const [pfad, titel] of SEITEN) {
    await page.goto(pfad)
    await expect(page, pfad).toHaveURL(new RegExp(pfad))
    await expect(page.getByRole("heading", { level: 1 }).first(), pfad).toHaveText(titel)
    await expect(page.getByText("Da ist etwas schiefgelaufen"), pfad).toHaveCount(0)
  }
})

test("Ohne Admin-Rolle kein Zugang", async ({ page }) => {
  await page.goto("/admin/system")
  await expect(page).toHaveURL(/\/kreuzen/)

  const k = await kontoAnlegen()
  await einloggen(page, k.email, k.passwort)
  await page.goto("/admin/nutzer")
  await expect(page).toHaveURL(/\/kreuzen/)
  expect((await page.request.get("/api/admin/sentry-test")).status()).toBeGreaterThanOrEqual(401)
})

test("Pflichtseiten und Health-Check erreichbar", async ({ page }) => {
  for (const pfad of ["/impressum", "/agb", "/datenschutz", "/widerruf", "/kuendigung"]) {
    expect((await page.goto(pfad))?.status(), pfad).toBe(200)
  }
  const h = await page.request.get("/api/health")
  expect((await h.json()).ok).toBe(true)
})
