import { Metadata } from "next"

export const metadata: Metadata = {
  title: "AGB | fragenkreuzen.de",
  description: "Allgemeine Geschäftsbedingungen der Thavarajasingam, Ahkash; Eid, Mustafa Magdy Abdel Razik Mahmoud GbR",
}

export default function AGBPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Allgemeine Geschäftsbedingungen</h1>
      
      <div className="prose prose-gray max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">§ 1 Geltungsbereich</h2>
          <p className="mb-4">
            Diese Allgemeinen Geschäftsbedingungen (nachfolgend "AGB") der Thavarajasingam, Ahkash; Eid, Mustafa Magdy Abdel Razik Mahmoud GbR, 
            Warburghof 14, 30627 Hannover (nachfolgend "Anbieter"), gelten für alle 
            Verträge über die Nutzung der Online-Lernplattform "fragenkreuzen.de" (nachfolgend "Plattform").
          </p>
          <p className="mb-4">
            Abweichende, entgegenstehende oder ergänzende AGB des Kunden werden nicht Vertragsbestandteil, 
            es sei denn, ihrer Geltung wird ausdrücklich zugestimmt.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">§ 2 Vertragspartner</h2>
          <p className="mb-4">
            <strong>Anbieter:</strong><br />
            Thavarajasingam, Ahkash; Eid, Mustafa Magdy Abdel Razik Mahmoud GbR<br />
            Ahkash Thavarajasingam<br />
            Mustafa Magdy Abdel Razik Mahmoud Eid<br />
            Warburghof 14<br />
            30627 Hannover<br />
            E-Mail: info@ultima-rat.io
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">§ 3 Leistungsgegenstand</h2>
          <p className="mb-4">
            Der Anbieter stellt eine Online-Lernplattform zur Verfügung, die medizinische 
            Prüfungsvorbereitung für das 2. Staatsexamen anbietet. Die Plattform umfasst:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
            <li>Zugang zu Prüfungsfragen und Fallvignetten</li>
            <li>Übungsmodus und Prüfungsmodus</li>
            <li>Auswertung und Statistiken</li>
            <li>Spaced Repetition System</li>
            <li>KI-Tutor Unterstützung</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">§ 4 Registrierung und Nutzerkonto</h2>
          <p className="mb-4">
            Für die Nutzung der Plattform ist eine Registrierung erforderlich. Der Nutzer verpflichtet sich, 
            wahrheitsgemäße und vollständige Angaben zu machen. Die Registrierung erfolgt durch:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
            <li>Angabe von Name, E-Mail-Adresse und Passwort</li>
            <li>Bestätigung der E-Mail-Adresse</li>
            <li>Akzeptierung dieser AGB und der Datenschutzerklärung</li>
          </ul>
          <p className="mb-4">
            Der Nutzer ist verpflichtet, seine Zugangsdaten geheim zu halten und Dritten keinen Zugang zu seinem 
            Konto zu gewähren.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">§ 5 Preise und Zahlungsbedingungen</h2>
          <p className="mb-4">
            Die Preise für die angebotenen Leistungen sind auf der Plattform ausgewiesen und verstehen sich 
            inklusive der gesetzlichen Mehrwertsteuer. Zahlungen erfolgen über die integrierten Zahlungssysteme 
            (Stripe). Der Zugang zu kostenpflichtigen Inhalten wird nach erfolgreicher Zahlung freigeschaltet.
          </p>
          <p className="mb-4">
            Bei Zahlungsverzug behält sich der Anbieter das Recht vor, den Zugang zur Plattform zu sperren.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">§ 6 Nutzungsrechte</h2>
          <p className="mb-4">
            Der Nutzer erhält ein nicht-exklusives, nicht übertragbares Recht zur Nutzung der Plattform 
            für den persönlichen Gebrauch. Eine kommerzielle Nutzung oder Weitergabe der Inhalte ist nicht gestattet.
          </p>
          <p className="mb-4">
            Der Nutzer verpflichtet sich, die Plattform nicht zu missbrauchen und keine illegalen Aktivitäten 
            durchzuführen.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">§ 7 Haftung</h2>
          <p className="mb-4">
            Der Anbieter haftet nur für Vorsatz und grobe Fahrlässigkeit. Die Haftung für leichte Fahrlässigkeit 
            ist ausgeschlossen, es sei denn, es werden wesentliche Vertragspflichten verletzt.
          </p>
          <p className="mb-4">
            Der Anbieter übernimmt keine Gewähr für den Erfolg der Prüfungsvorbereitung oder die Richtigkeit 
            aller Inhalte. Die Plattform dient der Unterstützung des Lernprozesses.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">§ 8 Datenschutz</h2>
          <p className="mb-4">
            Die Erhebung und Verarbeitung personenbezogener Daten erfolgt gemäß der Datenschutzerklärung, 
            die Bestandteil dieser AGB ist.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">§ 9 Kündigung</h2>
          <p className="mb-4">
            Beide Parteien können das Nutzungsverhältnis jederzeit mit einer Frist von 14 Tagen kündigen. 
            Das Recht zur fristlosen Kündigung aus wichtigem Grund bleibt unberührt.
          </p>
          <p className="mb-4">
            Bei Verstößen gegen diese AGB behält sich der Anbieter das Recht vor, das Nutzerkonto zu sperren 
            oder zu löschen.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">§ 10 Schlussbestimmungen</h2>
          <p className="mb-4">
            Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der 
            übrigen Bestimmungen unberührt.
          </p>
          <p className="mb-4">
            Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist [Ort des Anbieters], 
            soweit der Nutzer Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches 
            Sondervermögen ist.
          </p>
        </section>

        <div className="text-sm text-gray-600 mt-8 pt-4 border-t">
          <p><strong>Stand:</strong> 05.10.2025</p>
          <p><strong>Gültig ab:</strong> 05.10.2025</p>
        </div>
      </div>
    </div>
  )
}
