// lib/mail.ts
import nodemailer from "nodemailer"

const host = process.env.EMAIL_SERVER_HOST
const port = Number(process.env.EMAIL_SERVER_PORT || 587)
const user = process.env.EMAIL_SERVER_USER
const pass = process.env.EMAIL_SERVER_PASSWORD
const from = process.env.EMAIL_FROM || "UltimaRatio <noreply@example.com>"

let transporter: nodemailer.Transporter | null = null

export function getTransporter() {
  if (!host || !user || !pass) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
  }
  return transporter
}

export async function sendVerificationEmail(to: string, code: string) {
  const subject = "Dein UltimaRatio Bestätigungs-Code"
  const text = `Dein Bestätigungs-Code lautet: ${code}\nEr ist 15 Minuten gültig.`
  const t = getTransporter()

  // Kein SMTP konfiguriert → DEV-Fallback (nur loggen)
  if (!t) {
    console.warn("[MAIL:DEV] Kein SMTP aktiv – Code:", code, "Empfänger:", to)
    return { dev: true }
  }

  try {
    await t.sendMail({ from, to, subject, text })
    return { dev: false }
  } catch (err) {
    // SMTP schlägt fehl → DEV-Fallback statt 500
    console.warn("[MAIL:DEV] SMTP fehlgeschlagen, Fallback. Fehler:", (err as Error).message, "Code:", code, "Empfänger:", to)
    return { dev: true, error: String(err) }
  }
}
