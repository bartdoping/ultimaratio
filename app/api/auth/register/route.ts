// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { sendVerificationMail } from "@/lib/mail";

export const runtime = "nodejs";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  surname: z.string().min(1),
});

function generateSixDigitCode(): string {
  // 000000–999999, immer 6-stellig
  return Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    const { email, password, name, surname } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ ok: false, error: "email_taken" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, name, surname, passwordHash, role: "user" },
      select: { id: true, email: true },
    });

    const code = generateSixDigitCode();
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        code,
        // ⚠️ hier war dein Fehler: "new Date(...)" statt "Date(...)"
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    // Email-Verification senden
    try {
      await sendVerificationMail(user.email, code);
      console.log("Verification email sent to:", user.email);
    } catch (emailError) {
      console.error("Email send failed:", emailError);
      // User wird trotzdem erstellt, aber Email-Verification fehlgeschlagen
      return NextResponse.json({ 
        ok: false, 
        error: "email_send_failed",
        message: "User erstellt, aber Email konnte nicht gesendet werden. Bitte kontaktiere den Support."
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("register error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}