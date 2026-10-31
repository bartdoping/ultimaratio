import { expect, test } from "@playwright/test"
import { bannerAblehnen, einloggen, kontoAnlegen, neueMail, neuesPasswort, prisma } from "./helpers"

test("Registrieren, Code bestätigen, eingeloggt landen", async ({ page }) => {
  const email = neueMail()
  await page.goto("/login?callbackUrl=%2Fkreuzen")
  await bannerAblehnen(page)
  await page.getByLabel("E-Mail-Adresse").fill(email)
  await page.getByRole("button", { name: "Fortsetzen" }).click()
  await page.locator("#password").fill(neuesPasswort())
  await page.getByRole("button", { name: "Account erstellen" }).click()
  await expect(page.locator("#code")).toBeVisible()

  // Der Code steht in der Dev-Datenbank; Mails verschickt der Testlauf nicht.
  const eintrag = await prisma.emailVerification.findFirstOrThrow({ where: { user: { email } }, orderBy: { expiresAt: "desc" } })
  await page.locator("#code").fill(eintrag.code)
  await page.getByRole("button", { name: /Bestätigen/ }).click()

  await expect(page).toHaveURL(/\/kreuzen/)
  await expect.poll(async () => (await prisma.user.findUnique({ where: { email } }))?.emailVerifiedAt != null).toBe(true)
})

test("Falsches Passwort wird abgewiesen", async ({ page }) => {
  const k = await kontoAnlegen()
  await page.goto("/login")
  await bannerAblehnen(page)
  await page.getByLabel("E-Mail-Adresse").fill(k.email)
  await page.getByRole("button", { name: "Fortsetzen" }).click()
  await page.locator("#password").fill("falsch-falsch-falsch")
  await page.getByRole("button", { name: "Einloggen" }).click()
  await expect(page.getByRole("alert").filter({ hasText: /./ }).first()).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test("Konto löschen entfernt Konto und Abo-Zeile", async ({ page }) => {
  const k = await kontoAnlegen()
  await prisma.subscription.create({ data: { userId: k.id, status: "free" } })
  await einloggen(page, k.email, k.passwort)
  await page.goto("/account")
  await page.getByRole("button", { name: "Löschung starten" }).click()
  await page.locator("#confirmation").fill(`LÖSCHEN ${k.email.toUpperCase()}`)
  page.on("dialog", (d) => d.accept())
  await page.getByRole("button", { name: /löschen/i }).last().click()

  await expect.poll(() => prisma.user.count({ where: { id: k.id } })).toBe(0)
  expect(await prisma.subscription.count({ where: { userId: k.id } })).toBe(0)
})
