import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Impressum | UltimaRatio",
  description: "Impressum und rechtliche Angaben der UltimaRatio GbR",
}

export default function ImpressumPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Impressum</h1>
      
      <div className="prose prose-gray max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Angaben gemäß § 5 TMG</h2>
          <div className="space-y-2">
            <p><strong>Thavarajasingam, Ahkash; Eid, Mustafa Magdy Abdel Razik Mahmoud GbR</strong></p>
            <p>Warburghof 14</p>
            <p>30627 Hannover, Deutschland</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Kontakt</h2>
          <div className="space-y-2">
            <p><strong>Telefon:</strong> +49 163 9347633</p>
            <p><strong>E-Mail:</strong> info@ultima-rat.io</p>
            <p><strong>Website:</strong> https://fragenkreuzen.de</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Vertreten durch</h2>
          <div className="space-y-2">
            <p>Mustafa Magdy Abdel Razik Mahmoud Eid</p>
            <p>Ahkash Thavarajasingam</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
          <div className="space-y-2">
            <p>Ahkash Thavarajasingam</p>
            <p>Warburghof 14</p>
            <p>30627 Hannover</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Gewerbeanmeldung</h2>
          <div className="space-y-2">
            <p>Die Gewerbeerlaubnis nach § 14 GewO wurde am 21.04.2025 durch die</p>
            <p>Gewerbemeldestelle der Landeshauptstadt Hannover,</p>
            <p>Schützenplatz 1, 30169 Hannover, erteilt.</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Haftungsausschluss</h2>
          
          <h3 className="text-xl font-semibold mb-3">Haftung für Inhalte</h3>
          <p className="mb-4">
            Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den 
            allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht 
            unter der Verpflichtung, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach 
            Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
          </p>
          <p className="mb-4">
            Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen 
            Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der 
            Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen 
            werden wir diese Inhalte umgehend entfernen.
          </p>

          <h3 className="text-xl font-semibold mb-3">Haftung für Links</h3>
          <p className="mb-4">
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. 
            Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten 
            Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten 
            wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren 
            zum Zeitpunkt der Verlinkung nicht erkennbar.
          </p>
          <p className="mb-4">
            Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer 
            Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links 
            umgehend entfernen.
          </p>

          <h3 className="text-xl font-semibold mb-3">Urheberrecht</h3>
          <p className="mb-4">
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen 
            Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der 
            Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. 
            Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
          </p>
          <p className="mb-4">
            Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter 
            beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine 
            Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden 
            von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Streitschlichtung</h2>
          <p className="mb-4">
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
            <a 
              href="https://ec.europa.eu/consumers/odr/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline ml-1"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
          </p>
          <p className="mb-4">
            Unsere E-Mail-Adresse finden Sie oben im Impressum.
          </p>
          <p className="mb-4">
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Datenschutz</h2>
          <p className="mb-4">
            Die Nutzung unserer Webseite ist in der Regel ohne Angabe personenbezogener Daten möglich. Soweit auf 
            unseren Seiten personenbezogene Daten (beispielsweise Name, Anschrift oder E-Mail-Adressen) erhoben werden, 
            erfolgt dies, soweit möglich, stets auf freiwilliger Basis. Diese Daten werden ohne Ihre ausdrückliche 
            Zustimmung nicht an Dritte weitergegeben.
          </p>
          <p className="mb-4">
            Wir weisen darauf hin, dass die Datenübertragung im Internet (z.B. bei der Kommunikation per E-Mail) 
            Sicherheitslücken aufweisen kann. Ein lückenloser Schutz der Daten vor dem Zugriff durch Dritte ist nicht 
            möglich.
          </p>
          <p className="mb-4">
            <strong>Hinweis zur verantwortlichen Stelle:</strong><br />
            Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
          </p>
          <div className="ml-4 space-y-1">
            <p>[Vorname] [Nachname]</p>
            <p>[Straße und Hausnummer]</p>
            <p>[PLZ] [Ort]</p>
            <p>E-Mail: info@ultima-rat.io</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Bildnachweis</h2>
          <p className="mb-4">
            Die auf dieser Website verwendeten Bilder und Grafiken stammen, sofern nicht anders angegeben, von:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Eigene Erstellung</li>
            <li>Lizenzfreie Bilddatenbanken</li>
            <li>Open Source Materialien</li>
          </ul>
        </section>

        <div className="text-sm text-gray-600 mt-8 pt-4 border-t">
          <p><strong>Stand:</strong> 05.10.2025</p>
          <p><strong>Quelle:</strong> Erstellt mit rechtlicher Beratung für GbR-Strukturen</p>
        </div>
      </div>
    </div>
  )
}
