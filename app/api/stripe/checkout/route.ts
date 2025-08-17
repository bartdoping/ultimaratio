// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/auth";
import prisma from "@/lib/db";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { slug } = await req.json().catch(() => ({} as any));
  if (!slug) return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 401 });

  const exam = await prisma.exam.findUnique({ where: { slug } });
  if (!exam || !exam.isPublished) {
    return NextResponse.json({ ok: false, error: "Exam not available" }, { status: 404 });
  }

  // Schon gekauft?
  const purchased = await prisma.purchase.findFirst({ where: { userId: user.id, examId: exam.id } });
  if (purchased) {
    return NextResponse.json({ ok: true, already: true, redirect: `/exams/${slug}` });
  }

  const successUrl = `${process.env.NEXTAUTH_URL}/exams/${slug}?success=1&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${process.env.NEXTAUTH_URL}/exams/${slug}?canceled=1`;

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: session.user.email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: exam.priceCents, // z. B. 1990 = 19,90 €
          product_data: {
            name: exam.title,
            description: exam.description,
            metadata: { examId: exam.id, slug: exam.slug }
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: user.id,
      examId: exam.id,
      slug: exam.slug,
    },
  });

  return NextResponse.json({ ok: true, url: checkout.url });
}
