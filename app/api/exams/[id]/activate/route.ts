import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    // User finden
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, subscriptionStatus: true, dailyQuestionsUsed: true, lastQuestionResetAt: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
    }

    // Prüfung finden
    const exam = await prisma.exam.findUnique({
      where: { id },
      select: { id: true, title: true, isPublished: true }
    });

    if (!exam || !exam.isPublished) {
      return NextResponse.json({ error: "Prüfung nicht gefunden" }, { status: 404 });
    }

    // Prüfen ob User bereits Pro-User ist oder Admin
    const isProUser = user.subscriptionStatus === "pro";
    const isAdmin = session.user.email === "info@ultima-rat.io" || session.user.email === "admin@fragenkreuzen.de";

    if (!isProUser && !isAdmin) {
      // Für Free-User: Prüfen ob noch Fragen übrig sind
      const now = new Date();
      const lastReset = user.lastQuestionResetAt ? new Date(user.lastQuestionResetAt) : new Date(0);
      const isNewDay = now.getTime() - lastReset.getTime() >= 24 * 60 * 60 * 1000;
      
      let questionsUsed = user.dailyQuestionsUsed;
      if (isNewDay) {
        questionsUsed = 0;
      }

      if (questionsUsed >= 20) {
        return NextResponse.json({ 
          error: "Tageslimit erreicht", 
          message: "Du hast dein tägliches Limit von 20 Fragen erreicht. Upgrade zu Pro für unbegrenzten Zugang!",
          upgradeRequired: true
        }, { status: 403 });
      }
    }

    // Prüfung aktivieren (Purchase erstellen)
    const existingPurchase = await prisma.purchase.findUnique({
      where: { userId_examId: { userId: user.id, examId: exam.id } }
    });

    if (existingPurchase) {
      return NextResponse.json({ 
        message: "Prüfung bereits aktiviert",
        activated: true 
      });
    }

    await prisma.purchase.create({
      data: {
        userId: user.id,
        examId: exam.id,
        stripeSessionId: `activation_${Date.now()}`, // Dummy Session ID für Aktivierungen
        createdAt: new Date()
      }
    });

    return NextResponse.json({ 
      message: "Prüfung erfolgreich aktiviert",
      activated: true 
    });

  } catch (error) {
    console.error("Error activating exam:", error);
    return NextResponse.json(
      { error: "Fehler beim Aktivieren der Prüfung" },
      { status: 500 }
    );
  }
}
