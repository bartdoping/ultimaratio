import { expect, test } from "@playwright/test"
import { bannerAblehnen, einloggen, frageBeantworten, kontoAnlegen, prisma, THEMA } from "./helpers"

const LINK = `/kreuzen?thema=${encodeURIComponent(THEMA)}`

test("ohne Konto: Frage, Auflösung, nächste Frage", async ({ page }) => {
  await page.goto(LINK)
  await bannerAblehnen(page)
  await frageBeantworten(page)
  await expect(page.getByText("Stimmt.", { exact: true }).first()).toBeVisible()
  await page.getByRole("button", { name: /Weiter/ }).click()
  await expect(page.getByRole("button", { name: "Prüfen" })).toBeVisible()
})

test("mit Konto: Antwort wird gespeichert", async ({ page }) => {
  const k = await kontoAnlegen()
  await einloggen(page, k.email, k.passwort)
  await page.goto(LINK)
  await frageBeantworten(page)
  await expect.poll(() => prisma.poolAnswer.count({ where: { userId: k.id, correct: true } })).toBe(1)
})

test("Free-Konto: Kontingent zählt beantwortete Fragen", async ({ page }) => {
  const k = await kontoAnlegen()
  await einloggen(page, k.email, k.passwort)
  const vorher = await (await page.request.get("/api/kreuzen/quota")).json()
  await page.goto(LINK)
  await frageBeantworten(page)
  const nachher = await (await page.request.get("/api/kreuzen/quota")).json()
  expect(nachher.quota.used).toBe(vorher.quota.used + 1)
})
