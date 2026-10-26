import type { Metadata } from "next"
import { LegalShell, LegalSection } from "@/components/legal/legal-shell"

export const metadata: Metadata = {
  title: "AGB | fragenkreuzen.de",
  description:
    "Allgemeine Geschäftsbedingungen für die Nutzung von fragenkreuzen.de — Kreuz-Modus, Generator, Pro-Monatsabo, Examenspass und Jahrespass.",
}

export default function AgbPage() {
  return (
    <LegalShell
      title="Allgemeine Geschäftsbedingungen (AGB)"
      description="Für die Nutzung von fragenkreuzen.de (Kreuz-Modus und Generator)."
      lastUpdated="25. Oktober 2026"
    >
      <LegalSection title="§ 1 Geltungsbereich und Anbieter">
        <p>
          (1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend „<strong>AGB</strong>")
          gelten für alle Verträge über die Nutzung der Online-Plattform{" "}
          <a
            href="https://fragenkreuzen.de"
            target="_blank"
            rel="noopener noreferrer"
          >
            fragenkreuzen.de
          </a>{" "}
          (nachfolgend „<strong>Plattform</strong>" oder „<strong>Dienst</strong>")
          zwischen
        </p>
        <p>
          <strong>
            Thavarajasingam, Ahkash; Eid, Mustafa Magdy Abdel Razik Mahmoud GbR
          </strong>
          <br />
          Hallesche Straße 94a, 44143 Dortmund, Deutschland
          <br />
          E-Mail:{" "}
          <a href="mailto:info@ultima-rat.io">info@ultima-rat.io</a>
        </p>
        <p>
          (nachfolgend „<strong>Anbieterin</strong>") und ihren Nutzerinnen und
          Nutzern (nachfolgend „<strong>Nutzer</strong>").
        </p>
        <p>
          (2) Die Plattform richtet sich primär an Verbraucherinnen und
          Verbraucher im Sinne des § 13 BGB (insbesondere Studierende der Human-
          und Zahnmedizin). Eine Nutzung durch Unternehmer im Sinne des § 14 BGB
          ist möglich; für Unternehmer gelten ergänzend die in diesen AGB
          besonders gekennzeichneten Regelungen.
        </p>
        <p>
          (3) Abweichende, entgegenstehende oder ergänzende
          Geschäftsbedingungen des Nutzers werden nur dann und insoweit
          Vertragsbestandteil, als die Anbieterin ihrer Geltung ausdrücklich
          schriftlich zugestimmt hat.
        </p>
      </LegalSection>

      <LegalSection title="§ 2 Leistungsbeschreibung">
        <p>(1) Die Anbieterin stellt über die Plattform insbesondere bereit:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            den <strong>Kreuz-Modus</strong>: medizinische Single-Choice-Übungsfragen
            aus einem gemeinsamen Fragenpool, die bei Bedarf KI-gestützt neu erzeugt
            werden, mit Auflösung und Erklärung, Wiederholung falsch beantworteter
            Fragen, Probeklausuren und Auswertungen des Lernstands;
          </li>
          <li>
            den <strong>Generator</strong>: die Erstellung eigener Fragen zu einem
            frei gewählten Sachthema (Einzelfragen oder Fallfragen mit 2–5
            Teilfragen).
          </li>
        </ul>
        <p>
          (2) Sämtliche Fragen und Erklärungen werden durch ein KI-Sprachmodell
          erzeugt und automatisiert geprüft; es gilt § 10.
        </p>
        <p>(3) Es bestehen die folgenden Nutzungsstufen:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Ohne Konto:</strong> bis zu zehn (10) beantwortete Fragen im
            Kreuz-Modus und bis zu drei (3) Generierungen pro Kalendertag.
          </li>
          <li>
            <strong>Free</strong> (kostenloses Konto): bis zu fünfundzwanzig (25)
            beantwortete Fragen im Kreuz-Modus und bis zu drei (3) Generierungen
            pro Kalendertag (jede Teilfrage einer Fallfrage zählt als eigene
            Generierung).
          </li>
          <li>
            <strong>Pro:</strong> Kreuz-Modus ohne festes Tageskontingent im Rahmen
            von Absatz 5 (Fair Use) sowie bis zu einhundert (100) Generierungen pro
            Kalendertag.
          </li>
        </ul>
        <p>
          (4) Pro-Zugang kann erworben werden als <strong>Pro-Monatsabo</strong>,
          als <strong>Examenspass</strong> (90 Tage) oder als{" "}
          <strong>Jahrespass</strong> (12 Monate); Preise und Laufzeiten ergeben
          sich aus §§ 4 und 5. Daneben kann Pro-Zugang aus der einmaligen
          Testphase (§ 3 Abs. 6) oder als Bonuszeit aus dem Empfehlungsprogramm
          (§ 5a) bestehen. Die inhaltlichen Funktionen sind in allen Stufen
          identisch; die Stufen unterscheiden sich durch die Kontingente.
        </p>
        <p>
          (5) <strong>Fair Use.</strong> Pro-Zugang dient der persönlichen
          Nutzung durch den Kontoinhaber. Zum Schutz vor Missbrauch und zur
          Sicherung der Verfügbarkeit für alle Nutzer gelten folgende technische
          Grenzen: höchstens einhundert (100) Generierungen pro Kalendertag,
          höchstens einhundertfünfzig (150) automatische Neuerzeugungen von
          Fragen im Kreuz-Modus pro Kalendertag (Fragen aus dem bestehenden
          Fragenpool sind davon nicht betroffen) sowie höchstens zwei (2)
          gleichzeitig angemeldete Geräte (§ 3 Abs. 5). Bei außergewöhnlich hoher
          Gesamtauslastung kann die Neuerzeugung von Fragen vorübergehend für alle
          Nutzer ausgesetzt werden; bereits vorhandene Fragen bleiben verfügbar.
        </p>
        <p>
          (6) Die täglichen Kontingente setzen sich um 00:00 Uhr
          Mitteleuropäische Zeit (Europe/Berlin) zurück. Nicht verbrauchte
          Kontingente verfallen. Im Kreuz-Modus zählen beantwortete Fragen;
          fällige Wiederholungen bereits gespeicherter Fragen zählen nicht.
        </p>
        <p>
          (7) Die Anbieterin behält sich vor, das Leistungsangebot
          weiterzuentwickeln, anzupassen oder einzelne Funktionen zu ergänzen,
          zu modifizieren oder einzustellen. Wesentliche Änderungen am
          vertraglichen Leistungsumfang werden gemäß § 13 dieser AGB
          kommuniziert.
        </p>
      </LegalSection>

      <LegalSection title="§ 3 Registrierung und Vertragsschluss">
        <p>
          (1) Die Nutzung der Plattform setzt im Free-Tarif teilweise und für
          Pro-Zugang vollständig die Anlage eines Nutzerkontos voraus. Hierfür
          sind eine gültige E-Mail-Adresse sowie ein selbstgewähltes Passwort
          erforderlich. Die Registrierung ist nur Personen erlaubt, die das 16.
          Lebensjahr vollendet haben.
        </p>
        <p>
          (2) Im Rahmen der Registrierung versendet die Anbieterin einen
          Bestätigungscode an die angegebene E-Mail-Adresse. Mit Eingabe des
          Codes erklärt der Nutzer verbindlich den Wunsch, ein Konto bei der
          Anbieterin zu eröffnen. Der Nutzungsvertrag über den{" "}
          <strong>Free-Tarif</strong> kommt mit der Bestätigung dieses Codes
          durch die Anbieterin (Aktivierung des Kontos) zustande.
        </p>
        <p>
          (3) Der Vertrag über ein <strong>Pro-Monatsabo</strong>, einen{" "}
          <strong>Examenspass</strong> oder einen <strong>Jahrespass</strong>{" "}
          kommt zustande, sobald der Nutzer im Bestellprozess des
          Zahlungsdienstleisters Stripe (siehe § 4) auf die Schaltfläche zur
          zahlungspflichtigen Bestellung klickt. Die Anbieterin bestätigt den
          Vertragsschluss unverzüglich per E-Mail.
        </p>
        <p>
          (4) Der Nutzer ist verpflichtet, bei der Registrierung wahrheitsgemäße
          und vollständige Angaben zu machen und Änderungen seiner Daten
          unverzüglich im Konto zu aktualisieren. Zugangsdaten sind geheim zu
          halten. Bei Verdacht auf Missbrauch ist die Anbieterin unverzüglich zu
          informieren.
        </p>
        <p>
          (5) Pro Person ist nur ein Nutzerkonto zulässig. Eine Weitergabe oder
          gemeinschaftliche Nutzung des Kontos ist untersagt. Gleichzeitig können
          höchstens zwei Geräte angemeldet sein; bei der Anmeldung auf einem
          weiteren Gerät wird die älteste Anmeldung beendet.
        </p>
        <p>
          (6) <strong>Testphase.</strong> Jedes Konto kann einmalig eine
          kostenlose Testphase von sieben (7) Tagen mit Pro-Zugang starten. Dafür
          sind keine Zahlungsdaten erforderlich; die Testphase endet automatisch
          und geht nicht in einen kostenpflichtigen Vertrag über. Schließt der
          Nutzer während der Testphase ein Pro-Monatsabo ab, erfolgt die erste
          Abbuchung erst mit Ende der Testphase, sofern diese bei Vertragsschluss
          noch mindestens 48 Stunden läuft; andernfalls sofort. Ein während der
          Testphase gekaufter Examens- oder Jahrespass beginnt mit dem Ende der
          Testphase.
        </p>
      </LegalSection>

      <LegalSection title="§ 4 Preise, Zahlung und Abrechnung">
        <p>
          (1) Der Free-Tarif ist kostenlos. Für Pro-Zugang gelten die zum
          Zeitpunkt der Bestellung auf der Plattform angegebenen Preise,
          gegenwärtig:
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Pro-Monatsabo:</strong> 9,99 € pro Monat;
          </li>
          <li>
            <strong>Examenspass:</strong> 24,99 € einmalig für 90 Tage;
          </li>
          <li>
            <strong>Jahrespass:</strong> 79,99 € einmalig für 12 Monate.
          </li>
        </ul>
        <p>
          Es handelt sich um Endpreise im Sinne der Preisangabenverordnung;
          weitere Kosten fallen nicht an. Die Anbieterin macht von der
          Kleinunternehmer­regelung nach § 19 UStG Gebrauch und erhebt daher keine
          Umsatzsteuer; ein Umsatzsteuer­ausweis erfolgt nicht.
        </p>
        <p>
          (2) Die Zahlung erfolgt über den Zahlungsdienstleister Stripe Payments
          Europe Limited, Block 4, Harcourt Centre, Harcourt Road, Dublin 2, Irland
          (nachfolgend „<strong>Stripe</strong>"). Es gelten zusätzlich die
          Geschäfts- und Datenschutz­bedingungen von Stripe. Das Pro-Monatsabo
          wird jeweils zu Beginn der monatlichen Abrechnungs­periode im Voraus
          abgerechnet (Prepaid). Examenspass und Jahrespass werden einmalig bei
          der Bestellung im Voraus bezahlt.
        </p>
        <p>
          (3) Akzeptiert werden alle von Stripe für den deutschen Markt
          unterstützten Zahlungsmethoden. Die konkret zur Verfügung stehenden
          Zahlungsmethoden werden im Bestellprozess angezeigt.
        </p>
        <p>
          (4) Das Pro-Monatsabo verlängert sich nach Ablauf der
          Abrechnungs­periode automatisch um jeweils einen weiteren Monat zu den
          dann gültigen Konditionen, sofern es nicht gemäß § 5 gekündigt wird.
          Examenspass und Jahrespass verlängern sich nicht.
        </p>
        <p>
          (5) Bei einer fehlgeschlagenen Zahlung (z. B. mangels Deckung)
          unternimmt Stripe in einem von der Anbieterin festgelegten Rahmen
          erneute Einzugsversuche. Bleibt die Zahlung dauerhaft erfolglos, ist
          die Anbieterin berechtigt, den Pro-Zugang zu deaktivieren und den
          Nutzer auf den Free-Tarif zurückzustufen, ohne dass dies eine
          Beendigung des Nutzungs­vertrags darstellt.
        </p>
        <p>
          (6) Rechnungen werden ausschließlich in elektronischer Form bereitgestellt
          — für das Pro-Monatsabo über das Stripe-Kundenportal, für Examenspass
          und Jahrespass per E-Mail. Der Nutzer stimmt der elektronischen
          Rechnungs­stellung zu.
        </p>
      </LegalSection>

      <LegalSection title="§ 5 Laufzeit, Kündigung und Kündigungsbutton">
        <p>
          (1) Der Vertrag über den Free-Tarif wird auf unbestimmte Zeit
          geschlossen und kann jederzeit ordentlich ohne Einhaltung einer Frist
          gekündigt werden.
        </p>
        <p>
          (2) Das Pro-Monatsabo hat eine Mindestlaufzeit von einem Monat. Es
          verlängert sich nach Ablauf der jeweils laufenden Abrechnungs­periode
          automatisch um jeweils einen weiteren Monat und kann mit einer Frist von{" "}
          <strong>einem Tag zum Ende der jeweils laufenden Abrechnungs­periode</strong>{" "}
          ordentlich gekündigt werden. Die Kündigung wirkt zum Ende der laufenden
          Periode; bis dahin bleibt der Pro-Zugang erhalten.
        </p>
        <p>
          (3) <strong>Examenspass und Jahrespass</strong> haben eine feste
          Laufzeit von 90 Tagen bzw. 12 Monaten ab Vertragsschluss und enden
          automatisch, ohne dass es einer Kündigung bedarf. Besteht beim Kauf
          bereits Pro-Zugang aus einem Pass oder aus Bonuszeit, schließt sich die
          neue Laufzeit an. Solange ein Pro-Monatsabo läuft, kann kein Pass
          erworben werden; solange ein Pass oder eine Bonuszeit läuft, kann kein
          Pro-Monatsabo abgeschlossen werden.
        </p>
        <p>
          (4) Die Kündigung des Pro-Monatsabos ist jederzeit über die hierfür
          eingerichtete Kündigungs­schaltfläche{" "}
          <strong>„Verträge hier kündigen"</strong> möglich. Diese ist auf jeder
          Seite im Fußbereich verlinkt, ständig verfügbar sowie unmittelbar und
          leicht zugänglich; eine Anmeldung ist dafür{" "}
          <strong>nicht erforderlich</strong> (
          <a href="/kuendigung">fragenkreuzen.de/kuendigung</a>). Auf der
          Bestätigungs­seite kann der Nutzer Art der Kündigung, Vertrag, seine
          Person und den gewünschten Beendigungs­zeitpunkt angeben und die
          Kündigung über die Schaltfläche „Jetzt kündigen" abgeben. Der Zugang der
          Kündigungs­erklärung wird dem Nutzer unverzüglich unter Angabe von Datum
          und Uhrzeit in Textform bestätigt; der Inhalt der Erklärung ist
          zusätzlich als Datei speicherbar. Damit werden die Anforderungen des
          § 312k BGB erfüllt. Angemeldete Nutzer können ihr Abonnement daneben
          weiterhin in der Abo-Verwaltung kündigen.
        </p>
        <p>
          (5) Eine Kündigung ist zusätzlich in Textform (z. B. per E-Mail an{" "}
          <a href="mailto:info@ultima-rat.io">info@ultima-rat.io</a>) möglich.
        </p>
        <p>
          (6) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund
          bleibt für beide Seiten unberührt. Ein wichtiger Grund für die
          Anbieterin liegt insbesondere bei wesentlichem Verstoß des Nutzers
          gegen diese AGB, gegen geltendes Recht oder gegen die Pflichten aus
          § 8 dieser AGB vor.
        </p>
      </LegalSection>

      <LegalSection title="§ 5a Empfehlungsprogramm und Creator-Codes">
        <p>
          (1) Jeder Nutzer mit Konto erhält einen persönlichen Einladungslink.
          Legt eine eingeladene Person über diesen Link ein neues Konto an,
          bestätigt ihre E-Mail-Adresse und beantwortet im Kreuz-Modus zwanzig
          (20) Fragen, erhalten beide jeweils <strong>30 Tage Pro-Zugang</strong>{" "}
          als Bonuszeit.
        </p>
        <p>
          (2) Je einladendem Konto werden höchstens zwölf (12) Einladungen
          belohnt. Die eingeladene Person erhält ihre Bonuszeit unabhängig davon.
        </p>
        <p>
          (3) Bonuszeit endet automatisch, ist nicht übertragbar und kann nicht
          ausgezahlt werden. Sie schließt sich an bestehende Bonuszeit oder einen
          laufenden Pass an; neben einem laufenden Pro-Monatsabo läuft sie
          parallel.
        </p>
        <p>
          (4) Einladungen an sich selbst, über mehrfach angelegte Konten oder auf
          automatisierte oder gekaufte Weise sind unzulässig. In diesen Fällen
          entfällt die Belohnung; bereits gewährte Bonuszeit kann entzogen werden.
        </p>
        <p>
          (5) Die Anbieterin kann das Empfehlungsprogramm mit Wirkung für die
          Zukunft ändern oder beenden; bereits erworbene Bonuszeit bleibt
          erhalten.
        </p>
        <p>
          (6) Creator-Codes von Kooperationspartnern ordnen eine Registrierung
          dem jeweiligen Partner zu. Für den Nutzer sind damit weder Vor- noch
          Nachteile verbunden.
        </p>
      </LegalSection>

      <LegalSection title="§ 6 Preisanpassungen">
        <p>
          (1) Die Anbieterin kann das Entgelt für das Pro-Monatsabo nach billigem
          Ermessen (§ 315 BGB) ändern, insbesondere um Änderungen der Kosten
          (z. B. Hosting-, Zahlungsdienstleister- oder Drittanbieter-KI-Kosten),
          der gesetzlichen Rahmenbedingungen oder der Marktbedingungen
          weiterzugeben. Für Examenspass und Jahrespass gilt der beim Kauf
          gezahlte Preis für die gesamte Laufzeit.
        </p>
        <p>
          (2) Preiserhöhungen werden dem Nutzer mindestens{" "}
          <strong>30 Tage vor ihrem Wirksamwerden</strong> in Textform (z. B.
          per E-Mail an die hinterlegte Adresse) angekündigt.
        </p>
        <p>
          (3) Der Nutzer hat das Recht, das Pro-Monatsabo aus Anlass der
          Preiserhöhung mit einer Frist von{" "}
          <strong>einem Tag zum Wirksamwerden der Preiserhöhung</strong>{" "}
          außerordentlich zu kündigen (Sonderkündigungsrecht). Wird das
          Sonderkündigungs­recht nicht ausgeübt und nutzt der Nutzer den Dienst
          nach Wirksamwerden der Preiserhöhung weiter, gilt die Preiserhöhung
          als angenommen. Auf das Sonderkündigungsrecht und die Bedeutung der
          Weiternutzung wird in der Mitteilung gesondert hingewiesen.
        </p>
      </LegalSection>

      <LegalSection title="§ 7 Widerrufsrecht für Verbraucher">
        <p>
          (1) Verbrauchern im Sinne des § 13 BGB steht beim Abschluss eines
          Pro-Monatsabos, eines Examenspasses oder eines Jahrespasses ein
          gesetzliches Widerrufs­recht von vierzehn Tagen zu. Die Einzelheiten
          sind in unserer <a href="/widerruf">Widerrufsbelehrung</a> geregelt.
        </p>
        <p>
          (2) Die Anbieterin stellt den Pro-Zugang unmittelbar nach
          Vertragsschluss bereit. Widerruft der Verbraucher fristgerecht,
          erstattet die Anbieterin — über die gesetzliche Pflicht hinaus — den{" "}
          <strong>vollen gezahlten Betrag</strong> und verlangt keinen Wertersatz
          für die bis zum Widerruf genutzte Zeit.
        </p>
      </LegalSection>

      <LegalSection title="§ 8 Pflichten und verbotene Nutzung">
        <p>(1) Der Nutzer verpflichtet sich, die Plattform nicht zu nutzen, um</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            rechtswidrige, sittenwidrige, jugendgefährdende,
            gewalt­verherrlichende, diskriminierende oder beleidigende Inhalte
            zu erstellen oder zu verbreiten,
          </li>
          <li>
            urheberrechtlich geschütztes Material Dritter ohne erforderliche
            Berechtigung in die Plattform einzugeben,
          </li>
          <li>
            personenbezogene Daten, insbesondere Gesundheitsdaten realer
            Personen, in Themen- oder Freitextfelder einzugeben (medizinische
            Echtdaten sind aus Datenschutzgründen ausdrücklich untersagt),
          </li>
          <li>
            die Plattform in einer Weise zu nutzen, die geeignet ist, deren
            technische Funktionsfähigkeit, Sicherheit oder Verfügbarkeit zu
            beeinträchtigen (z. B. automatisierte Abfragen, Scraping, Bots,
            Lastangriffe),
          </li>
          <li>
            Zugangsdaten, Sicherheitsfunktionen oder Tageskontingente zu
            umgehen, zu manipulieren oder das Konto mit Dritten zu teilen,
          </li>
          <li>
            auf der Plattform generierte Inhalte gewerblich, insbesondere zur
            Bereitstellung konkurrierender Frage- oder Lernplattformen, zu
            verwerten.
          </li>
        </ul>
        <p>
          (2) Bei Verstößen kann die Anbieterin – nach pflichtgemäßem Ermessen
          und unter Berücksichtigung des Einzelfalls – das Nutzerkonto sperren,
          die Nutzung einschränken, Inhalte entfernen und den Vertrag
          außerordentlich kündigen. Gesetzliche Schadensersatzansprüche bleiben
          unberührt.
        </p>
      </LegalSection>

      <LegalSection title="§ 9 Nutzungsrechte an generierten Inhalten">
        <p>
          (1) Die auf der Plattform bereitgestellten Fragen, Antwortoptionen und
          Erklärungen werden durch ein Sprachmodell (KI) automatisch erzeugt.
          Die rechtliche Einordnung KI-generierter Inhalte ist gegenwärtig
          uneinheitlich; die Anbieterin macht keine Zusicherungen über das
          Bestehen oder den Umfang etwaiger Urheber-, Leistungsschutz- oder
          ähnlicher Rechte an einzelnen generierten Ausgaben.
        </p>
        <p>
          (2) Die Anbieterin räumt dem Nutzer an den ihm bereitgestellten Fragen
          ein einfaches, nicht ausschließliches, nicht
          unter­lizenzierbares, zeitlich auf die Vertragsdauer und örtlich
          unbeschränktes Recht zur Nutzung der generierten Inhalte zu eigenen,
          nicht-kommerziellen Lern- und Prüfungs­vorbereitungs­zwecken ein. Eine
          gewerbliche Weiterverbreitung, eine Veröffentlichung in vergleichbaren
          Lernplattformen oder die Nutzung zu Trainingszwecken für eigene
          KI-Modelle ist nicht gestattet. Das Teilen einzelner Fragen über die
          dafür vorgesehene Teilen-Funktion ist erlaubt.
        </p>
        <p>
          (3) Die Plattform selbst (Software, Design, Texte, Marken, Logos und
          sonstige Inhalte mit Ausnahme der durch den Nutzer angeforderten
          KI-Ausgaben) ist urheberrechtlich geschützt und verbleibt bei der
          Anbieterin oder den jeweiligen Rechteinhabern.
        </p>
        <p>
          (4) Einzelfragen, die im Kreuz-Modus oder über den Generator erzeugt
          werden, können ohne Bezug zur Person des Nutzers in den gemeinsamen
          Fragenpool aufgenommen, anderen Nutzern angezeigt und über öffentliche
          Links geteilt werden. Auch deshalb dürfen Themeneingaben keine
          personenbezogenen Daten enthalten (§ 8 Abs. 1).
        </p>
      </LegalSection>

      <LegalSection title="§ 10 Medizinischer Haftungsausschluss">
        <p>
          (1) Die auf der Plattform bereitgestellten Fragen, Antwortoptionen,
          Erklärungen, Lernziele und Prüfungsfallen dienen ausschließlich
          akademischen Lern- und Prüfungs­vorbereitungs­zwecken im Rahmen des
          Medizin- oder Zahnmedizinstudiums.
        </p>
        <p>
          (2) Die Inhalte stellen{" "}
          <strong>
            keine medizinische, ärztliche oder zahn­ärztliche Beratung, Diagnose
            oder Therapieempfehlung
          </strong>{" "}
          dar und ersetzen weder eine ärztliche Untersuchung noch eine konkrete
          Behandlung. Eine Anwendung von Inhalten am Menschen oder eine
          Übernahme in die klinische Praxis erfolgt ausschließlich auf eigene
          Verantwortung und nach eigener fachlicher Prüfung.
        </p>
        <p>
          (3) KI-generierte Inhalte können fehlerhaft, unvollständig oder
          veraltet sein. Eine Gewähr für inhaltliche Richtigkeit, Aktualität
          oder Prüfungs­relevanz übernimmt die Anbieterin nicht.
        </p>
      </LegalSection>

      <LegalSection title="§ 11 Haftung">
        <p>
          (1) Die Anbieterin haftet unbeschränkt nach den gesetzlichen
          Vorschriften für Schäden aus der Verletzung des Lebens, des Körpers
          oder der Gesundheit, die auf einer fahrlässigen oder vorsätzlichen
          Pflicht­verletzung der Anbieterin, ihrer gesetzlichen Vertreter oder
          ihrer Erfüllungs­gehilfen beruhen, sowie für Schäden, die von der
          Haftung nach dem Produkthaftungs­gesetz umfasst werden, sowie für alle
          Schäden, die auf vorsätzlichen oder grob fahrlässigen Vertrags­verletzungen
          sowie auf Arglist der Anbieterin, ihrer gesetzlichen Vertreter oder
          Erfüllungs­gehilfen beruhen.
        </p>
        <p>
          (2) Im Übrigen haftet die Anbieterin nur bei der Verletzung
          vertrags­wesentlicher Pflichten (Kardinalpflichten), deren Erfüllung
          die ordnungs­gemäße Durchführung des Vertrags erst ermöglicht und auf
          deren Einhaltung der Nutzer regelmäßig vertrauen darf. In diesem Fall
          ist die Haftung der Anbieterin auf den vertrags­typischen, vorhersehbaren
          Schaden begrenzt.
        </p>
        <p>
          (3) Eine darüber hinausgehende Haftung der Anbieterin, insbesondere
          für leichte Fahrlässigkeit bei der Verletzung nicht
          vertrags­wesentlicher Pflichten sowie für mittelbare Schäden,
          entgangenen Gewinn, Datenverlust oder nicht vorhersehbare Folgeschäden,
          ist ausgeschlossen.
        </p>
        <p>
          (4) Die Anbieterin gewährt keine Verfügbarkeits­garantie. Sie ist
          bemüht, den Dienst möglichst durchgehend bereitzustellen, behält sich
          aber notwendige Wartungs­arbeiten und durch Drittanbieter (Hosting,
          KI-Provider, Zahlungs­dienstleister) bedingte Ausfälle vor.
        </p>
        <p>
          (5) Die vorstehenden Haftungs­begrenzungen gelten nicht im
          Anwendungs­bereich zwingender gesetzlicher Vorschriften (insbesondere
          bei Verbraucher­verträgen).
        </p>
      </LegalSection>

      <LegalSection title="§ 12 Datenschutz">
        <p>
          Die Anbieterin verarbeitet personenbezogene Daten ausschließlich im
          Rahmen der einschlägigen Datenschutz­vorschriften, insbesondere der
          DSGVO und des BDSG. Einzelheiten ergeben sich aus der{" "}
          <a href="/datenschutz">Datenschutz­erklärung</a>.
        </p>
      </LegalSection>

      <LegalSection title="§ 13 Änderungen dieser AGB">
        <p>
          (1) Die Anbieterin behält sich vor, diese AGB mit Wirkung für die
          Zukunft zu ändern, soweit dies erforderlich ist und der Nutzer
          hierdurch nicht unangemessen benachteiligt wird. Eine Änderung kommt
          insbesondere in Betracht bei Änderung der Rechtslage,
          höchst­richterlicher Rechtsprechung, technischer Rahmen­bedingungen,
          der Geschäfts­tätigkeit der Anbieterin oder eingesetzter
          Dienstleister.
        </p>
        <p>
          (2) Die Anbieterin teilt geplante Änderungen mindestens{" "}
          <strong>30 Tage vor ihrem Wirksamwerden</strong> in Textform mit. Die
          Mitteilung enthält einen Hinweis auf das Widerspruchsrecht und die
          Bedeutung der Schweigefrist.
        </p>
        <p>
          (3) Der Nutzer kann den Änderungen innerhalb von 30 Tagen nach Zugang
          der Mitteilung in Textform widersprechen. Erfolgt kein Widerspruch
          und nutzt der Nutzer den Dienst nach Ablauf der Frist weiter, gelten
          die Änderungen als angenommen.
        </p>
        <p>
          (4) Widerspricht der Nutzer fristgerecht, kann die Anbieterin den
          Vertrag mit einer Frist von einem Monat zum Ende der laufenden
          Abrechnungs­periode kündigen. Wesentliche Änderungen, die das
          Vertrags­gleichgewicht zwischen Hauptleistung und Gegenleistung
          betreffen (z. B. Reduzierung der Kontingente bei Pro-Zugang),
          erfolgen nur mit ausdrücklicher Zustimmung des Nutzers.
        </p>
      </LegalSection>

      <LegalSection title="§ 14 Pflichtinformationen für Verbraucher">
        <p>
          (1) Die Pflichtinformationen gemäß Art. 246a EGBGB sind in diesen
          AGB, in der <a href="/widerruf">Widerrufs­belehrung</a> sowie in der{" "}
          <a href="/datenschutz">Datenschutz­erklärung</a> enthalten und werden
          dem Nutzer im Bestellprozess zugänglich gemacht. Nach Vertrags­schluss
          erhält der Nutzer eine Bestätigung des Vertrags per E-Mail, der diese
          AGB und die Widerrufsbelehrung als Datei beigefügt sind
          (Vertrags­bestätigung auf einem dauerhaften Datenträger gemäß § 312f
          Abs. 2 BGB).
        </p>
        <p>
          (2) Die Anbieterin ist nicht bereit und nicht verpflichtet, an
          Streit­beilegungs­verfahren vor einer Verbraucher­schlichtungsstelle
          teilzunehmen (§ 36 Abs. 1 Nr. 1 VSBG). Siehe auch{" "}
          <a href="/impressum">Impressum</a>.
        </p>
      </LegalSection>

      <LegalSection title="§ 15 Schlussbestimmungen">
        <p>
          (1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss
          des UN-Kaufrechts. Bei Verbrauchern, die den Vertrag nicht zu
          beruflichen oder gewerblichen Zwecken abschließen, gilt diese
          Rechtswahl nur insoweit, als nicht der gewährte Schutz durch zwingende
          Bestimmungen des Rechts des Staates, in dem der Verbraucher seinen
          gewöhnlichen Aufenthalt hat, entzogen wird.
        </p>
        <p>
          (2) Ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder
          im Zusammenhang mit diesem Vertrag ist Dortmund, sofern der Nutzer
          Kaufmann, juristische Person des öffentlichen Rechts oder
          öffentlich-rechtliches Sondervermögen ist oder im Inland keinen
          allgemeinen Gerichtsstand hat. Für Verbraucher gelten die gesetzlichen
          Gerichtsstände.
        </p>
        <p>
          (3) Sollten einzelne Bestimmungen dieser AGB unwirksam, undurchführbar
          oder lückenhaft sein, so wird die Wirksamkeit der übrigen Bestimmungen
          hiervon nicht berührt. An die Stelle der unwirksamen oder
          undurchführbaren Bestimmung tritt die gesetzliche Regelung.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
