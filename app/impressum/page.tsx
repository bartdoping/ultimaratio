import type { Metadata } from "next"
import { LegalShell, LegalSection } from "@/components/legal/legal-shell"

export const metadata: Metadata = {
  title: "Impressum | fragenkreuzen.de",
  description:
    "Anbieterkennzeichnung gemäß § 5 DDG (vormals TMG) und § 18 Abs. 2 MStV.",
}

export default function ImpressumPage() {
  return (
    <LegalShell
      title="Impressum"
      description="Anbieterkennzeichnung gemäß § 5 DDG und § 18 Abs. 2 MStV."
      lastUpdated="31. Mai 2026"
    >
      <LegalSection title="1. Anbieter">
        <p>
          <strong>
            Thavarajasingam, Ahkash; Eid, Mustafa Magdy Abdel Razik Mahmoud GbR
          </strong>
        </p>
        <p>
          Hallesche Straße 94a
          <br />
          44143 Dortmund
          <br />
          Deutschland
        </p>
      </LegalSection>

      <LegalSection title="2. Vertretungsberechtigte Gesellschafter">
        <p>
          Vertretungsberechtigte Gesellschafter der Gesellschaft bürgerlichen
          Rechts (GbR) sind:
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>Ahkash Thavarajasingam</li>
          <li>Mustafa Magdy Abdel Razik Mahmoud Eid</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Kontakt">
        <p>
          Telefon: +49 163 9347633
          <br />
          E-Mail:{" "}
          <a href="mailto:info@ultima-rat.io">info@ultima-rat.io</a>
          <br />
          Website:{" "}
          <a
            href="https://fragenkreuzen.de"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://fragenkreuzen.de
          </a>
        </p>
      </LegalSection>

      <LegalSection title="4. Umsatzsteuer">
        <p>
          Die Anbieterin macht von der Kleinunternehmerregelung gemäß § 19 UStG
          Gebrauch, soweit dies steuerlich anwendbar ist. Eine
          Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG wird – soweit
          erforderlich – auf Anfrage mitgeteilt bzw. nachträglich ergänzt.
        </p>
      </LegalSection>

      <LegalSection title="5. Inhaltlich Verantwortliche gemäß § 18 Abs. 2 MStV">
        <p>
          Verantwortlich für den Inhalt der unter{" "}
          <a
            href="https://fragenkreuzen.de"
            target="_blank"
            rel="noopener noreferrer"
          >
            fragenkreuzen.de
          </a>{" "}
          erreichbaren Inhalte:
        </p>
        <p>
          Ahkash Thavarajasingam und Mustafa Magdy Abdel Razik Mahmoud Eid
          <br />
          Hallesche Straße 94a, 44143 Dortmund
        </p>
      </LegalSection>

      <LegalSection title="6. Streitschlichtung – OS-Plattform">
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streit­­beilegung
          (OS) bereit, die du hier findest:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          .
        </p>
        <p>
          Unsere E-Mail-Adresse findest du oben unter „Kontakt". Wir sind nicht
          bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen (§ 36 Abs. 1 Nr. 1 VSBG).
        </p>
      </LegalSection>

      <LegalSection title="7. Haftung für Inhalte">
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte
          auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach
          §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet,
          übermittelte oder gespeicherte fremde Informationen zu überwachen oder
          nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
          hinweisen.
        </p>
        <p>
          Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
          Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
          Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der
          Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden
          von entsprechenden Rechtsverletzungen werden wir diese Inhalte
          umgehend entfernen.
        </p>
      </LegalSection>

      <LegalSection title="8. Haftung für Links">
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren
          Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden
          Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten
          Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten
          verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der
          Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte
          waren zum Zeitpunkt der Verlinkung nicht erkennbar.
        </p>
        <p>
          Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch
          ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
          Bekanntwerden von Rechtsverletzungen werden wir derartige Links
          umgehend entfernen.
        </p>
      </LegalSection>

      <LegalSection title="9. Urheberrecht">
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen
          Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung,
          Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
          Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des
          jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite
          sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
        </p>
        <p>
          Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt
          wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden
          Inhalte Dritter als solche gekennzeichnet. Solltest du trotzdem auf
          eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen
          entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen
          werden wir derartige Inhalte umgehend entfernen.
        </p>
      </LegalSection>

      <LegalSection title="10. Medizinischer Haftungsausschluss">
        <p>
          Die mit dem KI-Generator erstellten Fragen und Erklärungen dienen
          ausschließlich Lern-, Übungs- und Prüfungsvorbereitungszwecken im
          Rahmen des Medizin- oder Zahnmedizinstudiums. Sie stellen{" "}
          <strong>
            keine medizinische Beratung, Diagnose oder Therapieempfehlung
          </strong>{" "}
          dar und ersetzen weder eine ärztliche Untersuchung noch eine
          Behandlung. Eine Anwendung der Inhalte am Menschen erfolgt auf eigene
          Verantwortung.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
