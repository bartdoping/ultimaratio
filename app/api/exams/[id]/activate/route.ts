import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  return NextResponse.json(
    {
      error: "activation_disabled",
      message: "Prüfungen werden nur über gültige Käufe, Pro-Zugriff oder kostenlose Demo-Freigaben aktiviert.",
    },
    { status: 410 }
  );
}
