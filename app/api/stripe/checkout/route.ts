// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/db";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";

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
      },
    });
    if (!exam || !exam.isPublished) {
      return NextResponse.json({ ok: false, error: "exam not found" }, { status: 404 });
    }

    // 4) Doppelkäufe verhindern
    const already = await prisma.purchase.findUnique({
      where: { userId_examId: { userId: me.id, examId: exam.id } },
      select: { id: true },
    });
    if (already) {
      return NextResponse.json({ ok: true, alreadyPurchased: true });
    }

    // 5) Preis prüfen und Stripe-Session bauen (immer price_data)
    const priceCents = Number(exam.priceCents);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      return NextResponse.json({ ok: false, error: "invalid price" }, { status: 400 });
    }

    const base = "https://fragenkreuzen.de";

    const s = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: exam.title,
              description: exam.description ?? undefined,
              metadata: { examId: exam.id, slug: exam.slug },
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${base}/exams/${exam.slug}?session_id={CHECKOUT_SESSION_ID}&purchase=success`,
      cancel_url: `${base}/exams/${exam.slug}?cancelled=true`,
      customer_email: me.email ?? undefined,
      metadata: {
        userId: me.id,
        examId: exam.id,
        slug: exam.slug,
        userEmail: me.email,
      },
      // Session-Informationen für bessere Persistenz
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 Minuten
    });

    return NextResponse.json({ ok: true, url: s.url });
  } catch (err: any) {
    console.error("checkout error", err);
    return NextResponse.json({ ok: false, error: "checkout failed" }, { status: 500 });
  }
}