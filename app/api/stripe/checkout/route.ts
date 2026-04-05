// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import stripe from "@/lib/stripe"
import { getAppBaseUrl } from "@/lib/app-base-url"
import Stripe from "stripe"

export const runtime = "nodejs"

/** Stripe Checkout: u. a. bei vielen EUR-Zahlarten mind. 1 € Session-Summe. */
const MIN_AMOUNT_CENTS_EUR = 100

function stripeLineText(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export async function POST(req: Request) {
  try {
    // 1) Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // 2) Body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
    }
    const slug = typeof body?.slug === "string" ? body.slug : null;
    if (!slug) {
      return NextResponse.json({ ok: false, error: "missing slug" }, { status: 400 });
    }

    // 3) User + Exam
    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true },
    });
    if (!me) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const exam = await prisma.exam.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        isPublished: true,
        priceCents: true,
        isFreeTrialDemo: true,
      },
    })
    if (!exam || !exam.isPublished) {
      return NextResponse.json({ ok: false, error: "exam not found" }, { status: 404 })
    }

    if (exam.isFreeTrialDemo) {
      return NextResponse.json(
        { ok: false, error: "trial_exam_not_for_sale" },
        { status: 400 }
      )
    }

    // 4) Doppelkäufe verhindern
    const already = await prisma.purchase.findUnique({
      where: { userId_examId: { userId: me.id, examId: exam.id } },
      select: { id: true },
    });
    if (already) {
      return NextResponse.json({ ok: true, alreadyPurchased: true, url: null })
    }

    // 5) Preis prüfen und Stripe-Session bauen (immer price_data)
    const priceCents = Number(exam.priceCents)
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      return NextResponse.json({ ok: false, error: "invalid price" }, { status: 400 })
    }
    if (priceCents < MIN_AMOUNT_CENTS_EUR) {
      return NextResponse.json(
        {
          ok: false,
          error: "price_too_low",
          details: `Der Einzelpreis muss mindestens ${(MIN_AMOUNT_CENTS_EUR / 100).toFixed(2)} € betragen (Stripe-Vorgabe für Checkout).`,
        },
        { status: 400 }
      )
    }

    const base = getAppBaseUrl()
    if (!base.startsWith("http://") && !base.startsWith("https://")) {
      return NextResponse.json(
        {
          ok: false,
          error: "server_misconfigured",
          details: "NEXT_PUBLIC_APP_URL muss eine gültige http(s)-URL sein.",
        },
        { status: 500 }
      )
    }

    const productName = stripeLineText(exam.title || "Prüfung", 250)
    const descRaw = exam.description?.trim()
    const productDescription = descRaw ? stripeLineText(descRaw, 450) : undefined

    const s = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: productName,
              ...(productDescription ? { description: productDescription } : {}),
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${base}/exams/${encodeURIComponent(exam.slug)}?session_id={CHECKOUT_SESSION_ID}&purchase=success`,
      cancel_url: `${base}/exams/${encodeURIComponent(exam.slug)}?cancelled=true`,
      customer_email: me.email ?? undefined,
      metadata: {
        userId: me.id,
        examId: exam.id,
        slug: exam.slug,
        userEmail: me.email ?? "",
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    })

    if (!s.url) {
      return NextResponse.json(
        { ok: false, error: "no_checkout_url", details: "Stripe hat keine Checkout-URL zurückgegeben." },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true, url: s.url })
  } catch (err: unknown) {
    console.error("checkout error", err)
    let details: string | undefined
    if (err instanceof Stripe.errors.StripeError) {
      details = err.message
    } else if (err instanceof Error) {
      details = err.message
    }
    return NextResponse.json(
      { ok: false, error: "checkout failed", details: details ?? "Unbekannter Fehler" },
      { status: 500 }
    )
  }
}