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
      select: { id: true },
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
