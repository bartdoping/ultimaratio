import type { Metadata } from "next"
import Link from "next/link"
import { LegalShell, LegalSection } from "@/components/legal/legal-shell"
import { CancellationForm } from "@/components/legal/cancellation-form"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Verträge hier kündigen | fragenkreuzen.de",
  description:
    "Kündige dein Pro-Abonnement direkt online – ohne Anmeldung, mit sofortiger Bestätigung per E-Mail (Kündigungsbutton gemäß § 312k BGB).",
  robots: { index: true, follow: true },
}

export default function KuendigungPage() {
  return (
    <LegalShell
      title="Verträge hier kündigen"
      description="Kündigungsmöglichkeit gemäß § 312k BGB – ohne Anmeldung nutzbar."
      lastUpdated="20. August 2026"
    >
      <LegalSection title="Pro-Abonnement kündigen">
        <p>
          Hier kannst du dein Pro-Abonnement zum Ende der laufenden
          Abrechnungs­periode kündigen. Fülle die Felder aus und klicke auf
          „Jetzt kündigen". Du erhältst umgehend eine Bestätigung deiner Kündigung
          mit Datum und Uhrzeit per E-Mail. Dein Pro-Zugang bleibt bis zum Ende der
          bereits bezahlten Periode aktiv; danach wechselst du automatisch in den
          kostenlosen Free-Tarif.
        </p>
        <p>
          Eine Anmeldung ist dafür <strong>nicht</strong> erforderlich. Alternativ
          kannst du jederzeit formlos per E-Mail an{" "}
          <a href="mailto:info@ultima-rat.io">info@ultima-rat.io</a> kündigen oder
          die Kündigungsfunktion in deiner{" "}
          <Link href="/subscription">Abo-Verwaltung</Link> nutzen.
        </p>
      </LegalSection>

      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <CancellationForm />
      </section>

      <LegalSection title="Hinweise">
        <ul className="list-inside list-disc space-y-1.5">
          <li>
            Der <strong>Free-Tarif</strong> ist dauerhaft kostenlos und muss nicht
            gekündigt werden.
          </li>
          <li>
            Möchtest du zusätzlich dein <strong>Nutzerkonto löschen</strong>, findest
            du die Funktion nach dem Login unter <Link href="/account">Account</Link>.
          </li>
          <li>
            Ein <strong>Widerruf</strong> innerhalb der ersten 14 Tage nach
            Vertragsschluss ist etwas anderes als eine Kündigung und führt zur
            Rückerstattung. Die Voraussetzungen findest du in der{" "}
            <Link href="/widerruf">Widerrufsbelehrung</Link>.
          </li>
          <li>
            Deine Kündigungserklärung wird zum Nachweis des Zugangs protokolliert.
            Näheres in der <Link href="/datenschutz">Datenschutzerklärung</Link>.
          </li>
        </ul>
      </LegalSection>
    </LegalShell>
  )
}
