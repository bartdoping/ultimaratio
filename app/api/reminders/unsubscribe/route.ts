import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getAppBaseUrl } from "@/lib/app-base-url"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Abmeldung von Lern-Erinnerungen per Link aus der Mail — ohne Login, ein Klick.
 * GET zeigt nur eine Bestätigungsseite (Mail-Scanner rufen Links vorab auf);
 * abgemeldet wird per POST aus dieser Seite oder per List-Unsubscribe-Post.
 */
function seite(token: string, erledigt: boolean): string {
  const base = getAppBaseUrl()
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Erinnerungen abbestellen</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:420px;margin:15vh auto;padding:0 16px;text-align:center;color:#111">
${
  erledigt
    ? `<h1 style="font-size:20px">Erledigt.</h1><p>Du bekommst keine Lern-Erinnerungen mehr. Einschalten kannst du sie jederzeit im Account.</p><p><a href="${base}/kreuzen">Zu fragenkreuzen</a></p>`
    : `<h1 style="font-size:20px">Lern-Erinnerungen abbestellen?</h1><form method="post"><input type="hidden" name="t" value="${token.replace(/[^A-Za-z0-9_-]/g, "")}"><button style="font-size:16px;padding:12px 22px;border-radius:999px;border:0;background:#0f766e;color:#fff;font-weight:600">Abbestellen</button></form>`
}
</body></html>`
}

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") ?? ""
  return new NextResponse(seite(t, false), { headers: { "Content-Type": "text/html; charset=utf-8" } })
}

export async function POST(req: Request) {
  let t = new URL(req.url).searchParams.get("t") ?? ""
  if (!t) {
    const form = await req.formData().catch(() => null)
    t = String(form?.get("t") ?? "")
  }
  if (t.length >= 16 && t.length <= 64) {
    await prisma.user.updateMany({ where: { reminderToken: t }, data: { reminderOptIn: false } })
  }
  return new NextResponse(seite("", true), { headers: { "Content-Type": "text/html; charset=utf-8" } })
}
