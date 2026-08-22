import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import stripe from "@/lib/stripe"
import { assertSameOrigin } from "@/lib/security"
import { sendMail } from "@/lib/mail"
import { rateLimitKey, tryAcquireAuth } from "@/lib/auth-rate-limit"
import { getClientIp, hashClientIp } from "@/lib/generator-limits"
import { getStripeSubscriptionPeriodBounds } from "@/lib/stripe-subscription-period"

export const runtime = "nodejs"

const ADMIN_RECIPIENT =
  process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || "info@ultima-rat.io"

const CONTRACT_LABEL = "Pro-Abonnement fragenkreuzen.de"

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) =>
    (({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }) as Record<string, string>)[ch]
  )
}

function formatBerlin(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "long",
    timeStyle: "short",
  }).format(d)
}

/**
 * POST /api/kuendigung — nimmt eine Kündigungserklärung nach § 312k BGB
 * entgegen. Bewusst OHNE Login-Zwang: die Kündigungsmöglichkeit muss ständig
 * verfügbar sowie unmittelbar und leicht zugänglich sein.
 *
 * Ablauf:
 *  1. Erklärung wird IMMER protokolliert (Zugangsnachweis, Fristwahrung).
 *  2. Existiert zur E-Mail ein aktives Abo, wird es zum Periodenende gekündigt.
 *  3. Der Erklärende erhält eine Bestätigung in Textform mit Datum und Uhrzeit.
 *
 * Datenschutz: Die HTTP-Antwort ist immer identisch und verrät nicht, ob zu
 * einer Adresse ein Konto oder Abo existiert (kein Account-Enumeration).
 * Konkrete Vertragsdetails stehen ausschließlich in der E-Mail an genau diese
 * Adresse.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
  } catch {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "invalid_email", message: "Bitte gib eine gültige E-Mail-Adresse an." },
      { status: 400 }
    )
  }

  const kind = body.kind === "ausserordentlich" ? "ausserordentlich" : "ordentlich"
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) || null : null
  const reasonRaw = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : ""
  const desiredDate =
    typeof body.desiredDate === "string" ? body.desiredDate.trim().slice(0, 120) || null : null

  if (kind === "ausserordentlich" && reasonRaw.length < 3) {
    return NextResponse.json(
      {
        ok: false,
        error: "reason_required",
        message: "Bei einer außerordentlichen Kündigung ist die Angabe eines Grundes erforderlich.",
      },
      { status: 400 }
    )
  }

  // Rate-Limit: schützt vor Massen-Missbrauch, ohne echte Kündigungen zu blockieren.
  const rl = tryAcquireAuth("cancellation", rateLimitKey(req, email))
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message:
          "Zu viele Anfragen. Bitte versuche es später erneut oder sende deine Kündigung formlos per E-Mail an info@ultima-rat.io.",
      },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    )
  }

  const receivedAt = new Date()
  const ipHash = hashClientIp(getClientIp(req))
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null

  // Konto zur E-Mail suchen (nur intern verwendet).
  //
  // WICHTIG: Schlägt der Lookup fehl (z. B. DB-Störung), darf das die
  // Entgegennahme der Kündigungserklärung NICHT verhindern. Die Erklärung ist
  // mit Zugang wirksam; wir protokollieren sie und markieren den Vorgang zur
  // manuellen Nachbearbeitung.
  let user: {
    id: string
    subscriptionStatus: string
    subscription: {
      stripeSubscriptionId: string | null
      currentPeriodEnd: Date | null
    } | null
  } | null = null
  let lookupFailed = false
  try {
    user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        subscriptionStatus: true,
        subscription: {
          select: { stripeSubscriptionId: true, currentPeriodEnd: true },
        },
      },
    })
  } catch (err) {
    lookupFailed = true
    console.error("[kuendigung] user lookup failed – Erklärung wird dennoch angenommen", err)
  }

  // 1) Erklärung protokollieren — immer, unabhängig vom Ergebnis.
  //
  // Scheitert das Speichern, wird die Kündigung TROTZDEM angenommen: Eine
  // zugegangene Kündigungserklärung ist wirksam; sie an einer technischen
  // Störung scheitern zu lassen, wäre mit § 312k BGB unvereinbar. Wir
  // vergeben dann eine Ersatz-Vorgangsnummer, bestätigen per E-Mail und
  // eskalieren intern zur manuellen Bearbeitung.
  let recordId: string
  let persistFailed = false
  try {
    const created = await prisma.cancellationRequest.create({
      data: {
        email,
        name,
        contractLabel: CONTRACT_LABEL,
        kind,
        reason: reasonRaw || null,
        desiredDate,
        userId: user?.id ?? null,
        receivedAt,
        ipHash,
        userAgent,
        status: "received",
      },
    })
    recordId = created.id
  } catch (err) {
    persistFailed = true
    recordId = `manuell-${receivedAt.getTime().toString(36)}`
    console.error(
      "[kuendigung] persist failed – Erklärung wird dennoch bestätigt, Vorgang:",
      recordId,
      err
    )
  }

  // 2) Abo kündigen, falls vorhanden.
  let outcome: "applied" | "no_subscription" | "failed" = "no_subscription"
  let periodEnd: Date | null = user?.subscription?.currentPeriodEnd ?? null
  let note: string | null = persistFailed
    ? "Protokollierung fehlgeschlagen – manuelle Nachbearbeitung nötig."
    : null

  if (lookupFailed) {
    // Wir wissen nicht, ob ein Abo besteht → als Störung behandeln, damit der
    // Vorgang intern manuell geprüft wird.
    outcome = "failed"
    note = [note, "Konto-Lookup fehlgeschlagen – Abo-Status unbekannt."]
      .filter(Boolean)
      .join(" ")
  } else if (user && user.subscriptionStatus === "pro") {
    const subId = user.subscription?.stripeSubscriptionId
    try {
      if (!subId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: "free" },
        })
        outcome = "applied"
        note = "Kein Stripe-Abo hinterlegt – Status direkt auf free gesetzt."
      } else if (subId.startsWith("simulated_")) {
        await prisma.subscription.update({
          where: { userId: user.id },
          data: { cancelAtPeriodEnd: true },
        })
        outcome = "applied"
        note = "Simuliertes Abo zum Periodenende gekündigt."
      } else {
        const updated = await stripe.subscriptions.update(subId, {
          cancel_at_period_end: true,
        })
        let bounds
        try {
          bounds = getStripeSubscriptionPeriodBounds(updated)
        } catch {
          bounds = getStripeSubscriptionPeriodBounds(
            await stripe.subscriptions.retrieve(subId)
          )
        }
        await prisma.subscription.update({
          where: { userId: user.id },
          data: {
            cancelAtPeriodEnd: true,
            currentPeriodStart: bounds.start,
            currentPeriodEnd: bounds.end,
            status: "pro",
          },
        })
        periodEnd = bounds.end
        outcome = "applied"
      }
    } catch (err) {
      console.error("[kuendigung] stripe/db update failed", err)
      outcome = "failed"
      note = err instanceof Error ? err.message.slice(0, 200) : "Unbekannter Fehler"
    }
  }

  if (!persistFailed) {
    try {
      await prisma.cancellationRequest.update({
        where: { id: recordId },
        data: { status: outcome, processedAt: new Date(), note },
      })
    } catch {
      // Protokoll-Update ist best-effort; die Erklärung selbst ist gespeichert.
    }
  }

  // 3) Bestätigung in Textform an den Erklärenden (§ 312k Abs. 2 S. 4 BGB).
  const receivedAtLabel = formatBerlin(receivedAt)
  const kindLabel = kind === "ausserordentlich" ? "Außerordentliche Kündigung" : "Ordentliche Kündigung"

  const statusSentence =
    outcome === "applied"
      ? periodEnd
        ? `Dein Pro-Abonnement wurde zum Ende der laufenden Abrechnungsperiode gekündigt. Dein Pro-Zugang bleibt noch bis zum ${formatBerlin(periodEnd)} aktiv, danach wechselst du automatisch in den kostenlosen Free-Tarif.`
        : "Dein Pro-Abonnement wurde zum Ende der laufenden Abrechnungsperiode gekündigt. Danach wechselst du automatisch in den kostenlosen Free-Tarif."
      : outcome === "failed"
        ? "Deine Kündigungserklärung ist form- und fristwahrend bei uns eingegangen. Bei der automatischen Verarbeitung ist ein technischer Fehler aufgetreten – wir setzen die Kündigung manuell um und melden uns bei dir. Deine Kündigung gilt mit dem oben genannten Zugangszeitpunkt als erklärt."
        : "Deine Kündigungserklärung ist bei uns eingegangen. Zu dieser E-Mail-Adresse ist derzeit kein aktives kostenpflichtiges Abonnement hinterlegt. Es entstehen dir keine weiteren Kosten. Falls du ein Abo unter einer anderen E-Mail-Adresse abgeschlossen hast, wiederhole die Kündigung bitte mit dieser Adresse."

  const textLines = [
    "Bestätigung deiner Kündigung",
    "",
    `Zugang der Kündigungserklärung: ${receivedAtLabel} (Uhrzeit in deutscher Zeit)`,
    `Vorgangsnummer: ${recordId}`,
    "",
    "Inhalt deiner Erklärung:",
    `- Vertrag: ${CONTRACT_LABEL}`,
    `- Art der Kündigung: ${kindLabel}`,
    `- E-Mail-Adresse des Kontos: ${email}`,
    name ? `- Name: ${name}` : "",
    desiredDate ? `- Gewünschter Beendigungszeitpunkt: ${desiredDate}` : "",
    reasonRaw ? `- Begründung: ${reasonRaw}` : "",
    "",
    statusSentence,
    "",
    "Diese E-Mail dient als Bestätigung deiner Kündigung in Textform gemäß § 312k Abs. 2 BGB. Bitte bewahre sie auf.",
    "",
    "Thavarajasingam, Ahkash; Eid, Mustafa Magdy Abdel Razik Mahmoud GbR",
    "Hallesche Straße 94a, 44143 Dortmund",
    "info@ultima-rat.io · https://fragenkreuzen.de",
  ].filter(Boolean)

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;color:#111">
  <h2 style="margin:0 0 4px">Bestätigung deiner Kündigung</h2>
  <p style="margin:0 0 16px;color:#555">Vorgangsnummer: ${escapeHtml(recordId)}</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <tr><td style="padding:6px 0;color:#555;width:45%">Zugang der Erklärung</td><td style="padding:6px 0"><strong>${escapeHtml(receivedAtLabel)}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#555">Vertrag</td><td style="padding:6px 0">${escapeHtml(CONTRACT_LABEL)}</td></tr>
    <tr><td style="padding:6px 0;color:#555">Art der Kündigung</td><td style="padding:6px 0">${escapeHtml(kindLabel)}</td></tr>
    <tr><td style="padding:6px 0;color:#555">E-Mail des Kontos</td><td style="padding:6px 0">${escapeHtml(email)}</td></tr>
    ${name ? `<tr><td style="padding:6px 0;color:#555">Name</td><td style="padding:6px 0">${escapeHtml(name)}</td></tr>` : ""}
    ${desiredDate ? `<tr><td style="padding:6px 0;color:#555">Beendigungszeitpunkt</td><td style="padding:6px 0">${escapeHtml(desiredDate)}</td></tr>` : ""}
    ${reasonRaw ? `<tr><td style="padding:6px 0;color:#555">Begründung</td><td style="padding:6px 0">${escapeHtml(reasonRaw)}</td></tr>` : ""}
  </table>
  <p style="margin:16px 0;padding:12px;background:#f4f6f8;border-radius:8px;font-size:14px">${escapeHtml(statusSentence)}</p>
  <p style="font-size:12px;color:#666">Diese E-Mail dient als Bestätigung deiner Kündigung in Textform gemäß § 312k Abs. 2 BGB. Bitte bewahre sie auf.</p>
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0">
  <p style="font-size:12px;color:#666;margin:0">
    Thavarajasingam, Ahkash; Eid, Mustafa Magdy Abdel Razik Mahmoud GbR<br>
    Hallesche Straße 94a, 44143 Dortmund<br>
    info@ultima-rat.io · https://fragenkreuzen.de
  </p>
</div>`

  try {
    await sendMail({
      to: email,
      subject: `Kündigungsbestätigung – ${CONTRACT_LABEL}`,
      text: textLines.join("\n"),
      html,
    })
  } catch (err) {
    console.warn("[kuendigung] confirmation mail failed", err)
  }

  // 4) Interne Benachrichtigung (best-effort).
  try {
    await sendMail({
      to: ADMIN_RECIPIENT,
      subject: `[fragenkreuzen] Kündigung eingegangen (${outcome})`,
      text: [
        `Vorgang: ${recordId}`,
        `Status: ${outcome}`,
        `Zugang: ${receivedAtLabel}`,
        `E-Mail: ${email}`,
        `Konto gefunden: ${user ? "ja" : "nein"}`,
        `Art: ${kindLabel}`,
        reasonRaw ? `Grund: ${reasonRaw}` : "",
        note ? `Notiz: ${note}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    })
  } catch {
    // ignore
  }

  // Einheitliche Antwort — keine Rückschlüsse auf Kontoexistenz.
  return NextResponse.json({
    ok: true,
    reference: recordId,
    receivedAt: receivedAt.toISOString(),
    receivedAtLabel,
    contractLabel: CONTRACT_LABEL,
    kindLabel,
    email,
    name,
    desiredDate,
    reason: reasonRaw || null,
  })
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 })
}
