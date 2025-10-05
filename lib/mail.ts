// lib/mail.ts
import "server-only"
import nodemailer from "nodemailer"

declare global {
  // Verhindert Mehrfach-Definition in Next.js Dev HMR
  // eslint-disable-next-line no-var
  var __mailerTransporter: nodemailer.Transporter | undefined
}

const FROM = process.env.EMAIL_FROM ?? "UltimaRatio <no-reply@example.com>"

function buildTransport() {
  // LETZTE LÖSUNG: Komplett neue Email-Konfiguration
  const config = {
    host: "smtp.zoho.eu",
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: "info@ultima-rat.io",
      pass: "6SAF9nEPm46m" // Ersetze mit dem echten App-Passwort
    },
    logger: true,
    debug: true,
    tls: {
      rejectUnauthorized: false
    }
  }

  console.log("🔧 FINAL Email Transport Configuration:", {
    host: config.host,
    port: config.port,
    user: config.auth.user,
    hasPassword: !!config.auth.pass,
    secure: config.secure
  })

  return nodemailer.createTransport(config)
}

function getTransporter(): nodemailer.Transporter {
  if (process.env.NODE_ENV === "production") {
    return buildTransport()
  }
  if (!global.__mailerTransporter) {
    global.__mailerTransporter = buildTransport()
    // nur in DEV verifizieren
    global.__mailerTransporter
      .verify()
      .then(() => console.log("[mail] SMTP verified"))
      .catch((err) => console.error("[mail] SMTP verify failed:", err))
  }
  return global.__mailerTransporter!
}

export async function sendMail(opts: {
  to: string
  subject: string
  text?: string
  html?: string
}) {
  const transporter = getTransporter()
  const info = await transporter.sendMail({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  })
  if (process.env.MAIL_DEBUG === "1") {
    console.log("[mail] sent:", info.messageId, info.response)
  }
}

export async function sendVerificationMail(to: string, code: string) {
  const subject = "Dein Bestätigungscode"
  const text = `Dein Bestätigungscode lautet: ${code}\n\nGültig für 15 Minuten.`
  const html = `
  <div style="font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:16px;">
    <h2 style="margin:0 0 8px 0;">Dein Bestätigungscode</h2>
    <p style="font-size:14px;margin:0 0 12px 0;">Nutze den folgenden Code, um deine E-Mail zu bestätigen (gültig für 15 Minuten):</p>
    <div style="font-size:28px;font-weight:700;letter-spacing:4px;">
      ${escapeHtml(code)}
    </div>
    <p style="font-size:12px;color:#666;margin-top:16px;">Wenn du das nicht warst, ignoriere diese E-Mail.</p>
  </div>
  `
  await sendMail({ to, subject, text, html })
}

// Passwort-Reset-Link
export async function sendPasswordResetMail(to: string, token: string) {
  // Basis-URL bestimmen (lokal/preview/prod)
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

  const url = `${appUrl}/reset?token=${encodeURIComponent(token)}`

  const subject = "Passwort zurücksetzen"
  const text = `Zum Zurücksetzen deines Passworts klicke auf: ${url}\n\nDieser Link ist 30 Minuten gültig.`
  const html = `
  <div style="font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:16px;">
    <h2 style="margin:0 0 8px 0;">Passwort zurücksetzen</h2>
    <p style="font-size:14px;margin:0 0 12px 0;">Klicke auf den Button, um dein Passwort zurückzusetzen:</p>
    <p>
      <a href="${escapeAttr(url)}"
         style="display:inline-block;padding:10px 16px;border-radius:8px;text-decoration:none;background:#111;color:#fff;">
        Passwort zurücksetzen
      </a>
    </p>
    <p style="font-size:12px;color:#666;margin-top:16px;">Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>
  </div>
  `
  await sendMail({ to, subject, text, html })
}

// — Helpers —
function escapeHtml(s: string) {
  return s.replace(/[&<>\"']/g, (ch) => (
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[ch]
  ))
}
function escapeAttr(s: string) {
  return escapeHtml(s)
}

// Alias (falls woanders noch sendVerificationEmail importiert wird)
export { sendVerificationMail as sendVerificationEmail }