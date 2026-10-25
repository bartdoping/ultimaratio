import type { Metadata } from "next"
import {
  LegalShell,
  LegalSection,
  LegalSubsection,
} from "@/components/legal/legal-shell"

export const metadata: Metadata = {
  title: "Widerrufsbelehrung | fragenkreuzen.de",
  description:
    "Gesetzliche Widerrufsbelehrung für das Pro-Abonnement auf fragenkreuzen.de inklusive Muster-Widerrufsformular.",
}

export default function WiderrufPage() {
  return (
    <LegalShell
      title="Widerrufsbelehrung"
      description="Belehrung über das Widerrufsrecht für Verbraucher bei kostenpflichtigen Verträgen (Pro-Monatsabo, Examenspass, Jahrespass)."
      lastUpdated="25. Oktober 2026"
    >
      <LegalSection title="1. Widerrufsrecht">
        <p>
          Du hast das Recht, binnen <strong>vierzehn Tagen</strong> ohne Angabe
          von Gründen diesen Vertrag zu widerrufen.
        </p>
        <p>
          Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertrags­schlusses
          (das heißt: ab dem Tag, an dem du ein Pro-Monatsabo, einen Examenspass
          oder einen Jahrespass kostenpflichtig bestellt hast).
        </p>
        <p>
          Um dein Widerrufsrecht auszuüben, musst du uns
        </p>
        <p>
          <strong>
            Thavarajasingam, Ahkash; Eid, Mustafa Magdy Abdel Razik Mahmoud GbR
          </strong>
          <br />
          Hallesche Straße 94a, 44143 Dortmund, Deutschland
          <br />
          Telefon: +49 163 9347633
          <br />
          E-Mail:{" "}
          <a href="mailto:info@ultima-rat.io">info@ultima-rat.io</a>
        </p>
        <p>
          mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter
          Brief oder eine E-Mail) über deinen Entschluss, diesen Vertrag zu
          widerrufen, informieren. Du kannst dafür das beigefügte
          Muster-Widerrufs­formular verwenden, das jedoch nicht vorgeschrieben
          ist.
        </p>
        <p>
          Zur Wahrung der Widerrufs­frist reicht es aus, dass du die Mitteilung
          über die Ausübung des Widerrufs­rechts vor Ablauf der Widerrufs­frist
          absendest.
        </p>
      </LegalSection>

      <LegalSection title="2. Folgen des Widerrufs">
        <p>
          Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die
          wir von dir erhalten haben, unverzüglich und spätestens binnen
          vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über
          deinen Widerruf dieses Vertrags bei uns eingegangen ist.
        </p>
        <p>
          Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du
          bei der ursprünglichen Transaktion eingesetzt hast, es sei denn, mit
          dir wurde ausdrücklich etwas anderes vereinbart; in keinem Fall
          werden dir wegen dieser Rückzahlung Entgelte berechnet.
        </p>
        <p>
          Das gilt auch, wenn du den Pro-Zugang während der Widerrufs­frist
          bereits genutzt hast: Wir erstatten dir den <strong>vollen Betrag</strong>{" "}
          und verlangen keinen Wertersatz für die genutzte Zeit.
        </p>
      </LegalSection>

      <LegalSection title="3. Beginn der Leistung">
        <p>
          Wir schalten den Pro-Zugang unmittelbar nach Vertragsschluss frei. Dein
          Widerrufsrecht bleibt davon unberührt.
        </p>
      </LegalSection>

      <LegalSection title="4. Ende der Widerrufsbelehrung">
        <p className="text-xs text-muted-foreground">
          Die vorstehende Widerrufsbelehrung entspricht dem amtlichen Muster
          nach Anlage 1 zu Artikel 246a § 1 Abs. 2 Satz 2 EGBGB; zu deinen
          Gunsten verzichten wir auf einen Wertersatz für bereits genutzte
          Leistungen.
        </p>
      </LegalSection>

      <LegalSection title="5. Muster-Widerrufsformular">
        <p className="text-sm text-muted-foreground">
          Wenn du den Vertrag widerrufen möchtest, kannst du dieses Formular
          ausfüllen und an uns zurücksenden (gesetzlich vorgesehene Vorlage
          gemäß Anlage 2 zu Artikel 246a § 1 Abs. 2 Satz 1 Nr. 1 EGBGB):
        </p>

        <div className="rounded-xl border bg-card/40 p-4 sm:p-5">
          <div className="space-y-3 text-sm">
            <p>
              An
              <br />
              <strong>
                Thavarajasingam, Ahkash; Eid, Mustafa Magdy Abdel Razik Mahmoud
                GbR
              </strong>
              <br />
              Hallesche Straße 94a
              <br />
              44143 Dortmund
              <br />
              Deutschland
              <br />
              E-Mail:{" "}
              <a href="mailto:info@ultima-rat.io">info@ultima-rat.io</a>
            </p>

            <LegalSubsection title="">
              <p>
                Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*)
                abgeschlossenen Vertrag über den Kauf der folgenden Waren (*) /
                die Erbringung der folgenden Dienstleistung (*):
              </p>
              <p className="border-l-2 border-border pl-3 italic text-muted-foreground">
                Pro-Monatsabo / Examenspass / Jahrespass (*) fragenkreuzen.de
              </p>
            </LegalSubsection>

            <ul className="list-inside list-none space-y-2">
              <li>— Bestellt am (*): ____________________</li>
              <li>— Erhalten am (*): ____________________</li>
              <li>— Name des/der Verbraucher(s): ____________________</li>
              <li>— Anschrift des/der Verbraucher(s): ____________________</li>
              <li>— E-Mail-Adresse des Kontos: ____________________</li>
              <li>
                — Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf
                Papier): ____________________
              </li>
              <li>— Datum: ____________________</li>
            </ul>

            <p className="text-xs text-muted-foreground">
              (*) Unzutreffendes streichen.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Du kannst das Formular auch frei formulieren. Wichtig ist, dass dein
          Widerrufs­wille klar erkennbar ist und uns die Mitteilung innerhalb
          der Frist zugeht.
        </p>
      </LegalSection>

      <LegalSection title="6. Abgrenzung: Widerruf und Kündigung">
        <p>
          Der <strong>Widerruf</strong> beendet den Vertrag rückwirkend innerhalb der
          14-tägigen Frist und führt zur vollständigen Rückerstattung bereits
          gezahlter Beträge. Die <strong>Kündigung</strong> beendet ein Pro-Monatsabo
          dagegen für die Zukunft zum Ende der laufenden Abrechnungs­periode.
          Examenspass und Jahrespass enden automatisch und müssen nicht gekündigt
          werden.
        </p>
        <p>
          Möchtest du dein Abonnement lediglich beenden, ohne die Widerrufsfrist in
          Anspruch zu nehmen, nutze bitte unseren Kündigungsbutton:{" "}
          <a href="/kuendigung">Verträge hier kündigen</a>.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
