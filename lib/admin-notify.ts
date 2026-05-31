// lib/admin-notify.ts
//
// Schlanker Helper für Admin-Benachrichtigungen:
//  - Neuer Nutzer registriert  → notifyAdminNewUser(email)
//  - Pro-Abo abgeschlossen     → notifyAdminNewProSubscription({...})
//
// Verhalten:
//  - Empfänger: `ADMIN_NOTIFICATION_EMAIL` (Default: info@ultima-rat.io)
//  - Per-Event Toggle via Env (`ADMIN_NOTIFY_NEW_USER` / `ADMIN_NOTIFY_NEW_PRO`),
//    Default = aktiv.
//  - Mail-Versand ist BEST-EFFORT — kein Throw nach außen, kein Block der
//    aufrufenden Logik (Register / Stripe-Webhook).
//  - Logs sind strukturiert und ohne PII außer einem maskierten Hash der
//    E-Mail (eindeutiger Marker für Operations ohne Klartext-PII im Log).
import "server-only"
import { createHash } from "crypto"
import { sendMail } from "@/lib/mail"

const DEFAULT_RECIPIENT = "info@ultima-rat.io"

function recipient(): string {
  const raw = process.env.ADMIN_NOTIFICATION_EMAIL?.trim()
  return raw && raw.length > 0 ? raw : DEFAULT_RECIPIENT
}

/** Default aktiv; explizit "false" / "0" deaktiviert. */
function flagEnabled(name: string): boolean {
  const v = (process.env[name] ?? "").trim().toLowerCase()
  if (v === "" ) return true
  return !(v === "false" || v === "0" || v === "off" || v === "no")
}

/** Stabiler, nicht-umkehrbarer Marker für Operations-Logs. */
function emailMarker(email: string): string {
  return createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex")
    .slice(0, 12)
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

function nowIso(): string {
  return new Date().toISOString()
}

export async function notifyAdminNewUser(email: string): Promise<void> {
  if (!flagEnabled("ADMIN_NOTIFY_NEW_USER")) return
  const e = email.trim().toLowerCase()
  if (!e) return

  const subject = `Neue Registrierung: ${e}`
  const ts = nowIso()
  const text = `Neue Registrierung auf fragenkreuzen.de\n\nE-Mail: ${e}\nZeitpunkt: ${ts}\n`
  const html = `
    <div style="font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; padding:16px;">
      <h2 style="margin:0 0 8px 0;">Neue Registrierung</h2>
      <p style="font-size:14px; margin:0 0 6px 0;">
        Ein neuer Nutzer hat sich auf fragenkreuzen.de registriert.
      </p>
      <table style="border-collapse:collapse; font-size:14px; margin-top:8px;">
        <tr>
          <td style="padding:4px 12px 4px 0; color:#666;">E-Mail</td>
          <td style="padding:4px 0;"><strong>${escapeHtml(e)}</strong></td>
        </tr>
        <tr>
          <td style="padding:4px 12px 4px 0; color:#666;">Zeitpunkt</td>
          <td style="padding:4px 0;">${escapeHtml(ts)}</td>
        </tr>
      </table>
      <p style="font-size:12px; color:#999; margin-top:16px;">
        Diese Benachrichtigung lässt sich via <code>ADMIN_NOTIFY_NEW_USER=false</code> deaktivieren.
      </p>
    </div>
  `

  try {
    await sendMail({ to: recipient(), subject, text, html })
    console.log("[admin-notify] new user", { marker: emailMarker(e) })
  } catch (err) {
    console.error("[admin-notify] new user failed", {
      marker: emailMarker(e),
      message: (err as Error)?.message?.slice(0, 200),
    })
  }
}

export type AdminProNotification = {
  email: string
  /** z. B. Stripe Subscription-ID, hilfreich für schnellen Dashboard-Lookup. */
  stripeSubscriptionId?: string | null
  /** Periodenende der laufenden Abrechnungsperiode. */
  currentPeriodEnd?: Date | null
  /** Trigger-Quelle für den Log-Kontext (z. B. Stripe-Event-Type). */
  source?: string
}

export async function notifyAdminNewProSubscription(
  data: AdminProNotification
): Promise<void> {
  if (!flagEnabled("ADMIN_NOTIFY_NEW_PRO")) return
  const e = (data.email ?? "").trim().toLowerCase()
  if (!e) return

  const subject = `Neuer Pro-Abschluss: ${e}`
  const ts = nowIso()
  const periodEnd = data.currentPeriodEnd
    ? data.currentPeriodEnd.toISOString()
    : "unbekannt"
  const subId = data.stripeSubscriptionId || "unbekannt"
  const src = data.source || "unbekannt"

  const text = [
    `Neuer Pro-Abschluss auf fragenkreuzen.de`,
    ``,
    `E-Mail: ${e}`,
    `Stripe Subscription-ID: ${subId}`,
    `Periodenende: ${periodEnd}`,
    `Trigger: ${src}`,
    `Zeitpunkt: ${ts}`,
  ].join("\n")

  const html = `
    <div style="font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; padding:16px;">
      <h2 style="margin:0 0 8px 0;">🎉 Neuer Pro-Abschluss</h2>
      <p style="font-size:14px; margin:0 0 6px 0;">
        Ein Nutzer hat ein Pro-Abo aktiviert.
      </p>
      <table style="border-collapse:collapse; font-size:14px; margin-top:8px;">
        <tr>
          <td style="padding:4px 12px 4px 0; color:#666;">E-Mail</td>
          <td style="padding:4px 0;"><strong>${escapeHtml(e)}</strong></td>
        </tr>
        <tr>
          <td style="padding:4px 12px 4px 0; color:#666;">Subscription-ID</td>
          <td style="padding:4px 0;"><code>${escapeHtml(subId)}</code></td>
        </tr>
        <tr>
          <td style="padding:4px 12px 4px 0; color:#666;">Periodenende</td>
          <td style="padding:4px 0;">${escapeHtml(periodEnd)}</td>
        </tr>
        <tr>
          <td style="padding:4px 12px 4px 0; color:#666;">Trigger</td>
          <td style="padding:4px 0;">${escapeHtml(src)}</td>
        </tr>
        <tr>
          <td style="padding:4px 12px 4px 0; color:#666;">Zeitpunkt</td>
          <td style="padding:4px 0;">${escapeHtml(ts)}</td>
        </tr>
      </table>
      <p style="font-size:12px; color:#999; margin-top:16px;">
        Diese Benachrichtigung lässt sich via <code>ADMIN_NOTIFY_NEW_PRO=false</code> deaktivieren.
      </p>
    </div>
  `

  try {
    await sendMail({ to: recipient(), subject, text, html })
    console.log("[admin-notify] new pro", {
      marker: emailMarker(e),
      source: src,
    })
  } catch (err) {
    console.error("[admin-notify] new pro failed", {
      marker: emailMarker(e),
      source: src,
      message: (err as Error)?.message?.slice(0, 200),
    })
  }
}
