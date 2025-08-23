// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import stripe from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return new NextResponse("Missing webhook secret", { status: 400 });

  const body = await req.text();
  let event: any;

  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as any; // Stripe.Checkout.Session
      if (s.payment_status !== "paid") return NextResponse.json({ ok: true });

      const userId = s.metadata?.userId as string | undefined;
      const examId = s.metadata?.examId as string | undefined;
      const stripeSessionId = s.id as string;

      if (userId && examId) {
        const exists = await prisma.purchase.findFirst({ where: { userId, examId } });
        if (!exists) {
          await prisma.purchase.create({ data: { userId, examId, stripeSessionId } });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("Webhook handler failed:", e);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}