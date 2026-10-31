import { expect, test } from "@playwright/test"
import Stripe from "stripe"
import { einloggen, kontoAnlegen, prisma } from "./helpers"

const SECRET = process.env.STRIPE_WEBHOOK_SECRET!

/** Webhook so zustellen, wie Stripe es tut: mit gültiger Signatur. */
function webhook(page: import("@playwright/test").Page, event: unknown, secret = SECRET) {
  const payload = JSON.stringify(event)
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret })
  return page.request.post("/api/stripe/webhook", {
    headers: { "stripe-signature": signature, "content-type": "application/json" },
    data: payload,
  })
}

const eventId = () => `evt_e2e_${Date.now()}_${Math.random().toString(36).slice(2)}`

function passKauf(userId: string) {
  return {
    id: eventId(),
    object: "event",
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: `cs_e2e_${Date.now()}`,
        object: "checkout.session",
        mode: "payment",
        payment_status: "paid",
        amount_total: 2499,
        currency: "eur",
        metadata: { userId, plan: "exam_pass" },
        customer_details: { email: null },
      },
    },
  }
}

test.afterAll(async () => {
  await prisma.stripeEventLog.deleteMany({ where: { eventId: { startsWith: "evt_e2e_" } } })
})

test("Examenspass: Webhook schaltet Pro frei, Wiederholung zählt nicht doppelt", async ({ page }) => {
  const k = await kontoAnlegen()
  await einloggen(page, k.email, k.passwort)
  const event = passKauf(k.id)

  expect((await webhook(page, event)).status()).toBe(200)
  const nach1 = await prisma.user.findUniqueOrThrow({ where: { id: k.id }, select: { proBonusUntil: true } })
  const tage = (nach1.proBonusUntil!.getTime() - Date.now()) / 86_400_000
  expect(tage).toBeGreaterThan(89)
  expect(tage).toBeLessThan(91)

  // Stripe stellt Ereignisse mitunter doppelt zu.
  const zweit = await webhook(page, event)
  expect((await zweit.json()).duplicate).toBe(true)
  const nach2 = await prisma.user.findUniqueOrThrow({ where: { id: k.id }, select: { proBonusUntil: true } })
  expect(nach2.proBonusUntil).toEqual(nach1.proBonusUntil)

  const quota = await (await page.request.get("/api/kreuzen/quota")).json()
  expect(quota.quota.unlimited).toBe(true)
})

test("Webhook mit falscher Signatur wird abgewiesen", async ({ page }) => {
  const k = await kontoAnlegen()
  const r = await webhook(page, passKauf(k.id), "whsec_falsch")
  expect(r.status()).toBe(400)
  expect((await prisma.user.findUniqueOrThrow({ where: { id: k.id } })).proBonusUntil).toBeNull()
})

test("Abo eines gelöschten Kontos bringt den Webhook nicht zum Scheitern", async ({ page }) => {
  const event = {
    id: eventId(),
    object: "event",
    type: "customer.subscription.updated",
    livemode: false,
    data: {
      object: {
        id: `sub_e2e_${Date.now()}`,
        object: "subscription",
        status: "active",
        customer: "cus_e2e",
        cancel_at_period_end: false,
        metadata: { userId: "gibt-es-nicht" },
        items: { data: [] },
      },
    },
  }
  expect((await webhook(page, event)).status()).toBe(200)
  const log = await prisma.stripeEventLog.findUniqueOrThrow({ where: { eventId: event.id } })
  expect(log.processedAt).not.toBeNull()
})

test("Preisseite zeigt die Tarife, Checkout führt zu Stripe", async ({ page }) => {
  const k = await kontoAnlegen()
  await einloggen(page, k.email, k.passwort)
  await page.goto("/pricing")
  await expect(page.getByRole("heading").first()).toBeVisible()
  const r = await page.request.post("/api/stripe/subscription/checkout", { data: { plan: "pro_monthly", returnTo: "/kreuzen" } })
  const d = await r.json()
  // Ohne Preis im Stripe-Testkonto lässt sich der Checkout lokal nicht öffnen.
  test.skip(!r.ok() && /price/i.test(JSON.stringify(d)), `Kein Testpreis in .env.local: ${JSON.stringify(d)}`)
  expect(r.ok(), JSON.stringify(d)).toBe(true)
  expect(d.url).toContain("checkout.stripe.com")
})
