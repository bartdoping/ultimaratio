import { expect, test } from "@playwright/test"

// Nur mit E2E_SENTRY_DSN (Attrappe): Die Sendung wird im Browser abgefangen, nichts verlässt den Rechner.
test("Browser-Fehler wird gemeldet, ohne E-Mail-Adresse", async ({ page }) => {
  test.skip(!process.env.E2E_SENTRY_DSN, "Nur mit E2E_SENTRY_DSN")
  const sendungen: string[] = []
  await page.route("**/envelope/**", (route) => {
    sendungen.push(route.request().postData() ?? "")
    return route.fulfill({ status: 200, body: "{}" })
  })
  await page.goto("/impressum")
  // Sentry wird nachgeladen — warten, bis der Fehler-Handler steht.
  await expect
    .poll(async () => {
      await page.evaluate(() => setTimeout(() => { throw new Error("Testfehler bei max@uni-koeln.de") }))
      return sendungen.join("\n")
    }, { timeout: 60_000, intervals: [2000] })
    .toContain("Testfehler bei [E-Mail]")
  const alles = sendungen.join("\n")
  expect(alles).not.toContain("max@uni-koeln.de")
  expect(alles).not.toContain("ur_consent")
})
