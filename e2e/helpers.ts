import { randomBytes } from "node:crypto"
import { expect, type Page } from "@playwright/test"
import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

export const prisma = new PrismaClient()

export const THEMA = "E2E Testthema Kreislauf"
export const THEMA_KEY = "e2e testthema kreislauf"
export const MAIL_DOMAIN = "e2e.fragenkreuzen.test"
export const RICHTIG = "Die richtige Testantwort"

export const neueMail = () => `e2e-${randomBytes(6).toString("hex")}@${MAIL_DOMAIN}`
export const neuesPasswort = () => randomBytes(18).toString("base64url")

/** Testkonto direkt in der Dev-Datenbank anlegen (bestätigt, ohne Registrierung). */
export async function kontoAnlegen(role: "user" | "admin" = "user") {
  const email = neueMail()
  const passwort = neuesPasswort()
  const user = await prisma.user.create({
    data: { email, name: "", surname: "", passwordHash: await hash(passwort, 10), role, emailVerifiedAt: new Date() },
    select: { id: true },
  })
  return { id: user.id, email, passwort }
}

export async function bannerAblehnen(page: Page) {
  const knopf = page.getByRole("button", { name: "Alle ablehnen" })
  if (await knopf.isVisible().catch(() => false)) await knopf.click()
}

export async function einloggen(page: Page, email: string, passwort: string) {
  await page.goto("/login?callbackUrl=%2Fkreuzen")
  await bannerAblehnen(page)
  await page.getByLabel("E-Mail-Adresse").fill(email)
  await page.getByRole("button", { name: "Fortsetzen" }).click()
  await page.locator("#password").fill(passwort)
  await page.getByRole("button", { name: "Einloggen" }).click()
  await expect(page).toHaveURL(/\/kreuzen/)
}

/** Eine Frage richtig beantworten und warten, bis der Server sie verbucht hat. */
export async function frageBeantworten(page: Page) {
  await expect(page.getByText(/E2E-Frage/).first()).toBeVisible()
  await page.getByText(RICHTIG).first().click()
  const antwort = page.waitForResponse((r) => r.url().includes("/api/kreuzen/answer") && r.request().method() === "POST")
  await page.getByRole("button", { name: "Prüfen" }).click()
  expect((await antwort).ok()).toBe(true)
}
