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
      description="Belehrung über das Widerrufsrecht für Verbraucher bei kostenpflichtigen Verträgen (Pro-Tarif)."
      lastUpdated="31. Mai 2026"
    >
      <LegalSection title="1. Widerrufsrecht">
        <p>
          Du hast das Recht, binnen <strong>vierzehn Tagen</strong> ohne Angabe
          von Gründen diesen Vertrag zu widerrufen.
        </p>
        <p>
          Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertrags­schlusses
          (das heißt: ab dem Tag, an dem du den Pro-Tarif kostenpflichtig bestellt
          hast und wir den Vertrags­schluss bestätigt haben).
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
          wir von dir erhalten haben, einschließlich der Lieferkosten (mit
          Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass du
          eine andere Art der Lieferung als die von uns angebotene, günstigste
          Standard­lieferung gewählt hast), unverzüglich und spätestens binnen
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
          Hast du verlangt, dass die Dienstleistungen während der Widerrufs­frist
          beginnen sollen, so hast du uns einen angemessenen Betrag zu zahlen,
          der dem Anteil der bis zu dem Zeitpunkt, zu dem du uns von der
          Ausübung des Widerrufs­rechts hinsichtlich dieses Vertrags
          unterrichtest, bereits erbrachten Dienstleistungen im Vergleich zum
          Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen entspricht.
        </p>
      </LegalSection>

      <LegalSection title="3. Vorzeitiges Erlöschen des Widerrufsrechts (digitale Dienste)">
        <p>
          Der Pro-Tarif stellt einen <strong>digitalen Dienst</strong> im Sinne
          des § 327 Abs. 1 BGB dar (Bereitstellung der Generator-Funktion über
          die Plattform).
        </p>
        <p>
          Dein Widerrufsrecht erlischt bei einem Vertrag über die Bereitstellung
          eines digitalen Dienstes vorzeitig, wenn wir mit der Vertrags­ausführung
          begonnen haben, nachdem du
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            ausdrücklich zugestimmt hast, dass wir mit der Vertrags­ausführung
            vor Ablauf der Widerrufs­frist beginnen, und
          </li>
          <li>
            deine Kenntnis davon bestätigt hast, dass du durch deine Zustimmung
            mit Beginn der Vertrags­ausführung dein Widerrufs­recht verlierst.
          </li>
        </ul>
        <p>
          Diese Bestätigungen erfolgen ausschließlich durch das aktive Setzen
          einer entsprechenden Checkbox im Bestellprozess. Ohne dieses
          ausdrückliche Einverständnis beginnen wir mit der Bereitstellung des
          Pro-Tarifs erst nach Ablauf der Widerrufs­frist.
        </p>
      </LegalSection>

      <LegalSection title="4. Ende der Widerrufsbelehrung">
        <p className="text-xs text-muted-foreground">
          Die vorstehende Widerrufsbelehrung entspricht dem amtlichen Muster
          nach Anlage 1 zu Artikel 246a § 1 Abs. 2 Satz 2 EGBGB, angepasst auf
          die Besonderheiten eines digitalen Abonnements (§ 327 BGB i. V. m.
          § 356 Abs. 4 BGB).
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
                Pro-Abonnement fragenkreuzen.de
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

      <LegalSection title="6. Hinweis zur Online-Streitbeilegung">
        <p>
          Die Europäische Kommission stellt eine Plattform zur
          Online-Streit­beilegung (OS) bereit:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          . Wir sind nicht bereit oder verpflichtet, an
          Streit­beilegungs­verfahren vor einer Verbraucher­schlichtungs­stelle
          teilzunehmen.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
