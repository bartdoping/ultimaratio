"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, Download, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

type Confirmation = {
  reference: string
  receivedAtLabel: string
  contractLabel: string
  kindLabel: string
  email: string
  name: string | null
  desiredDate: string | null
  reason: string | null
}

/**
 * Kündigungsformular nach § 312k BGB.
 *
 * Die Norm verlangt auf der Bestätigungsseite Eingabemöglichkeiten für:
 *  - Art der Kündigung (ordentlich / außerordentlich)
 *  - bei außerordentlicher Kündigung: den Grund
 *  - eindeutige Bezeichnung des Vertrags
 *  - eindeutige Bezeichnung der erklärenden Person
 *  - Zeitpunkt, zu dem gekündigt werden soll
 *  - Angaben zur schnellen elektronischen Übermittlung der Bestätigung
 *
 * Die Bestätigungsschaltfläche muss mit "jetzt kündigen" (o. ä. eindeutig)
 * beschriftet sein. Nach Abgabe müssen Inhalt der Erklärung sowie Datum und
 * Uhrzeit des Zugangs auf einem dauerhaften Datenträger speicherbar sein —
 * dafür gibt es hier den Download als Textdatei zusätzlich zur E-Mail.
 */
export function CancellationForm() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [kind, setKind] = useState<"ordentlich" | "ausserordentlich">("ordentlich")
  const [reason, setReason] = useState("")
  const [desiredDate, setDesiredDate] = useState("zum nächstmöglichen Zeitpunkt")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pending) return
    setError(null)

    if (!email.trim()) {
      setError("Bitte gib die E-Mail-Adresse deines Kontos an.")
      return
    }
    if (kind === "ausserordentlich" && reason.trim().length < 3) {
      setError("Bei einer außerordentlichen Kündigung ist ein Grund erforderlich.")
      return
    }

    setPending(true)
    try {
      const res = await fetch("/api/kuendigung", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          kind,
          reason: reason.trim() || undefined,
          desiredDate: desiredDate.trim() || undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok || !data.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Die Kündigung konnte nicht übermittelt werden. Bitte sende sie formlos per E-Mail an info@ultima-rat.io."
        )
        return
      }
      setConfirmation({
        reference: String(data.reference ?? ""),
        receivedAtLabel: String(data.receivedAtLabel ?? ""),
        contractLabel: String(data.contractLabel ?? ""),
        kindLabel: String(data.kindLabel ?? ""),
        email: String(data.email ?? ""),
        name: (data.name as string | null) ?? null,
        desiredDate: (data.desiredDate as string | null) ?? null,
        reason: (data.reason as string | null) ?? null,
      })
    } catch {
      setError(
        "Netzwerkfehler. Bitte versuche es erneut oder sende deine Kündigung formlos per E-Mail an info@ultima-rat.io."
      )
    } finally {
      setPending(false)
    }
  }

  if (confirmation) {
    return <CancellationReceipt data={confirmation} />
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">
          Art der Kündigung
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <KindOption
            active={kind === "ordentlich"}
            onSelect={() => setKind("ordentlich")}
            title="Ordentliche Kündigung"
            hint="Zum Ende der laufenden Abrechnungsperiode."
          />
          <KindOption
            active={kind === "ausserordentlich"}
            onSelect={() => setKind("ausserordentlich")}
            title="Außerordentliche Kündigung"
            hint="Aus wichtigem Grund – Begründung erforderlich."
          />
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="k-contract" className="text-sm font-medium text-foreground">
          Vertrag
        </label>
        <input
          id="k-contract"
          value="Pro-Abonnement fragenkreuzen.de"
          readOnly
          className="w-full rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">
          Der Free-Tarif ist kostenlos und muss nicht gekündigt werden; du kannst dein
          Konto jederzeit im Bereich „Account" löschen.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="k-email" className="text-sm font-medium text-foreground">
            E-Mail-Adresse deines Kontos <span className="text-destructive">*</span>
          </label>
          <input
            id="k-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="du@example.de"
            disabled={pending}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="k-name" className="text-sm font-medium text-foreground">
            Vor- und Nachname <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            id="k-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Max Mustermann"
            disabled={pending}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="k-date" className="text-sm font-medium text-foreground">
          Zeitpunkt, zu dem gekündigt werden soll
        </label>
        <input
          id="k-date"
          type="text"
          value={desiredDate}
          onChange={(e) => setDesiredDate(e.target.value)}
          placeholder="zum nächstmöglichen Zeitpunkt"
          disabled={pending}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {kind === "ausserordentlich" && (
        <div className="space-y-1.5">
          <label htmlFor="k-reason" className="text-sm font-medium text-foreground">
            Grund der außerordentlichen Kündigung <span className="text-destructive">*</span>
          </label>
          <textarea
            id="k-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 1000))}
            disabled={pending}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Wird übermittelt…
          </>
        ) : (
          "Jetzt kündigen"
        )}
      </button>

      <p className="text-xs text-muted-foreground">
        Mit dem Klick auf „Jetzt kündigen" gibst du eine verbindliche
        Kündigungserklärung ab. Du erhältst unmittelbar danach eine Bestätigung mit
        Datum und Uhrzeit des Zugangs per E-Mail.
      </p>
    </form>
  )
}

function KindOption({
  active,
  onSelect,
  title,
  hint,
}: {
  active: boolean
  onSelect: () => void
  title: string
  hint: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "rounded-xl border bg-background px-4 py-3 text-left transition-colors",
        active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted/40"
      )}
    >
      <span className="block text-sm font-medium text-foreground">{title}</span>
      <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
    </button>
  )
}

function CancellationReceipt({ data }: { data: Confirmation }) {
  const lines = [
    "KÜNDIGUNGSBESTÄTIGUNG",
    "",
    `Zugang der Kündigungserklärung: ${data.receivedAtLabel} (deutsche Zeit)`,
    `Vorgangsnummer: ${data.reference}`,
    "",
    "Inhalt der Erklärung:",
    `- Vertrag: ${data.contractLabel}`,
    `- Art der Kündigung: ${data.kindLabel}`,
    `- E-Mail-Adresse des Kontos: ${data.email}`,
    data.name ? `- Name: ${data.name}` : "",
    data.desiredDate ? `- Gewünschter Beendigungszeitpunkt: ${data.desiredDate}` : "",
    data.reason ? `- Begründung: ${data.reason}` : "",
    "",
    "Anbieterin:",
    "Thavarajasingam, Ahkash; Eid, Mustafa Magdy Abdel Razik Mahmoud GbR",
    "Hallesche Straße 94a, 44143 Dortmund, Deutschland",
    "info@ultima-rat.io · https://fragenkreuzen.de",
  ].filter(Boolean)

  function download() {
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Kuendigungsbestaetigung-${data.reference}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-4">
        <CheckCircle2
          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Deine Kündigung ist eingegangen
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Zugang der Erklärung:{" "}
            <strong className="text-foreground">{data.receivedAtLabel}</strong>. Eine
            Bestätigung in Textform haben wir an{" "}
            <strong className="text-foreground">{data.email}</strong> gesendet. Details zu
            deinem Vertrag findest du aus Datenschutzgründen ausschließlich in dieser
            E-Mail.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card/50 p-4">
        <h3 className="text-sm font-semibold text-foreground">Inhalt deiner Erklärung</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label="Vorgangsnummer" value={data.reference} mono />
          <Row label="Vertrag" value={data.contractLabel} />
          <Row label="Art der Kündigung" value={data.kindLabel} />
          <Row label="E-Mail-Adresse" value={data.email} />
          {data.name && <Row label="Name" value={data.name} />}
          {data.desiredDate && <Row label="Beendigungszeitpunkt" value={data.desiredDate} />}
          {data.reason && <Row label="Begründung" value={data.reason} />}
        </dl>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={download}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Bestätigung speichern
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Zur Startseite
        </Link>
      </div>

      <p className="text-xs text-muted-foreground">
        Bewahre diese Bestätigung auf. Sie belegt Inhalt und Zugangszeitpunkt deiner
        Kündigung gemäß § 312k Abs. 2 BGB.
      </p>
    </div>
  )
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-muted-foreground sm:w-48">{label}</dt>
      <dd className={cn("text-foreground", mono && "font-mono text-xs sm:text-sm")}>
        {value}
      </dd>
    </div>
  )
}
