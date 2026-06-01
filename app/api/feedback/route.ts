import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { assertSameOrigin } from "@/lib/security"
import { sendMail } from "@/lib/mail"

export const runtime = "nodejs"

const ALLOWED_CATEGORIES = new Set(["bug", "idea", "praise", "general"])
const MESSAGE_MAX = 2000

function recipient(): string {
  return (
    process.env.ADMIN_NOTIFICATION_EMAIL?.trim() ||
    process.env.FEEDBACK_RECIPIENT?.trim() ||
    "info@ultima-rat.io"
  )
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) =>
    (({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    } as Record<string, string>)[ch])
  )
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
  } catch {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const messageRaw = typeof body.message === "string" ? body.message.trim() : ""
  if (!messageRaw || messageRaw.length < 3) {
    return NextResponse.json(
      { ok: false, error: "message_required", message: "Bitte schreib uns kurz, was los ist." },
      { status: 400 }
    )
  }
  const message = messageRaw.slice(0, MESSAGE_MAX)
  const categoryRaw = typeof body.category === "string" ? body.category : "general"
  const category = ALLOWED_CATEGORIES.has(categoryRaw) ? categoryRaw : "general"
  const pageUrl =
    typeof body.pageUrl === "string" ? body.pageUrl.slice(0, 500) : null
  const userAgent =
    typeof body.userAgent === "string" ? body.userAgent.slice(0, 300) : null
  const emailFromBody =
    typeof body.email === "string" && body.email.includes("@")
      ? body.email.toLowerCase().trim().slice(0, 254)
      : null
  // Silent-Mode: kein Mail-Versand (für error.tsx → automatische Reports).
  const silent = body.silent === true

  const session = await getServerSession(authOptions)
  let userId: string | null = null
  let userEmail: string | null = emailFromBody
  if (session?.user?.email) {
    const u = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
      select: { id: true, email: true },
    })
    if (u) {
      userId = u.id
      userEmail = userEmail ?? u.email
    }
  }

  try {
    await prisma.userFeedback.create({
      data: {
        userId,
        email: userEmail,
        category,
        message,
        pageUrl,
        userAgent,
      },
    })
  } catch (err) {
    console.warn("[feedback] db.create failed", err)
    return NextResponse.json({ ok: false, error: "store_failed" }, { status: 500 })
  }

  if (!silent) {
    // Admin-Mail (Best-effort, niemals werfen)
    try {
      const subject = `[fragenkreuzen] Feedback (${category})`
      const lines = [
        `Kategorie: ${category}`,
        `Von: ${userEmail ?? "anonym"}`,
        pageUrl ? `Seite: ${pageUrl}` : "",
        userAgent ? `UA: ${userAgent}` : "",
        "",
        "Nachricht:",
        message,
      ].filter(Boolean)
      const text = lines.join("\n")
      const html = `
<div style="font-family:system-ui,sans-serif">
  <h2 style="margin:0 0 12px">Neues Feedback: ${escapeHtml(category)}</h2>
  <p><strong>Von:</strong> ${escapeHtml(userEmail ?? "anonym")}</p>
  ${pageUrl ? `<p><strong>Seite:</strong> <a href="${escapeHtml(pageUrl)}">${escapeHtml(pageUrl)}</a></p>` : ""}
  ${userAgent ? `<p style="color:#888;font-size:12px">${escapeHtml(userAgent)}</p>` : ""}
  <pre style="background:#f4f4f4;padding:12px;border-radius:6px;white-space:pre-wrap">${escapeHtml(message)}</pre>
</div>`
      await sendMail({
        to: recipient(),
        subject,
        text,
        html,
      })
    } catch (err) {
      console.warn("[feedback] sendMail failed", err)
    }
  }

  return NextResponse.json({ ok: true })
}
