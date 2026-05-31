import type { Metadata } from "next"
import {
  LegalShell,
  LegalSection,
  LegalSubsection,
} from "@/components/legal/legal-shell"

export const metadata: Metadata = {
  title: "Datenschutzerklärung | fragenkreuzen.de",
  description:
    "Informationen zur Verarbeitung personenbezogener Daten auf fragenkreuzen.de gemäß Art. 13 DSGVO.",
}

export default function DatenschutzPage() {
  return (
    <LegalShell
      title="Datenschutzerklärung"
      description="Information über die Verarbeitung personenbezogener Daten auf fragenkreuzen.de gemäß Art. 13 DSGVO."
      lastUpdated="31. Mai 2026"
    >
      <LegalSection title="1. Verantwortlicher">
        <p>
          Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) und
          anderer nationaler Datenschutz­gesetze ist:
        </p>
        <p>
          <strong>
            Thavarajasingam, Ahkash; Eid, Mustafa Magdy Abdel Razik Mahmoud GbR
          </strong>
          <br />
          Hallesche Straße 94a
          <br />
          44143 Dortmund, Deutschland
          <br />
          Telefon: +49 163 9347633
          <br />
          E-Mail:{" "}
          <a href="mailto:info@ultima-rat.io">info@ultima-rat.io</a>
        </p>
        <p>
          Für datenschutzrechtliche Anliegen stehen wir unter der vorstehenden
          E-Mail-Adresse zur Verfügung (Stichwort: „Datenschutz"). Ein
          betrieblicher Datenschutz­beauftragter ist nach § 38 BDSG derzeit nicht
          erforderlich; eine entsprechende Einschätzung wird laufend überprüft.
        </p>
      </LegalSection>

      <LegalSection title="2. Allgemeine Hinweise zur Datenverarbeitung">
        <p>
          Wir verarbeiten personenbezogene Daten unserer Nutzer grundsätzlich
          nur, soweit dies zur Bereitstellung einer funktionsfähigen Plattform
          sowie unserer Inhalte und Leistungen erforderlich ist oder sofern Du
          in die Verarbeitung Deiner personenbezogenen Daten eingewilligt hast.
          Rechtsgrundlage für die Verarbeitung ist – sofern nicht ausdrücklich
          anders ausgewiesen – Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
          oder Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer
          sicheren, funktionsfähigen Plattform).
        </p>
        <p>
          Die personenbezogenen Daten werden auf Servern unseres Hosters in der
          Europäischen Union verarbeitet; technisch bedingte Zugriffe aus den
          USA können im Rahmen des Betriebs auftreten (siehe Ziffer 4).
        </p>
      </LegalSection>

      <LegalSection title="3. Verarbeitung beim Aufruf der Plattform (Server-Log-Dateien)">
        <p>
          Beim bloßen informatorischen Aufruf unserer Plattform werden durch
          unseren Hoster automatisiert Informationen erfasst, die der Browser
          an unseren Server übermittelt. Verarbeitet werden insbesondere:
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            IP-Adresse (zur Sicherheits-/Missbrauchs­erkennung in einer auf das
            erforderliche Maß reduzierten Speicherdauer; kann gekürzt
            gespeichert werden),
          </li>
          <li>Datum und Uhrzeit der Anfrage,</li>
          <li>angefragte URL und HTTP-Status,</li>
          <li>User-Agent (Browser, Betriebssystem),</li>
          <li>Referrer (zuvor besuchte Seite, sofern verfügbar).</li>
        </ul>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
          an der Sicherheit und Stabilität des Dienstes). Die Daten werden
          gelöscht, sobald sie für die Zweck­erreichung nicht mehr erforderlich
          sind.
        </p>
      </LegalSection>

      <LegalSection title="4. Hosting: Vercel">
        <p>
          Die Plattform wird gehostet von der{" "}
          <strong>Vercel Inc.</strong>, 440 N Barranca Avenue #4133, Covina, CA
          91723, USA, sowie europäischen Tochter­gesellschaften
          (gemeinsam: „Vercel"). Vercel betreibt eine global verteilte
          Infrastruktur; Anfragen werden typischer­weise von einem Edge-Knoten
          innerhalb der Europäischen Union oder des EWR ausgeliefert. Es kann
          jedoch im Rahmen administrativer Tätigkeiten und der Bereitstellung
          des Dienstes zu Datenflüssen in die USA kommen.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
          an einer zuverlässigen, performanten und sicheren Bereitstellung der
          Plattform). Wir haben mit Vercel einen Auftrags­verarbeitungs­vertrag
          (Data Processing Agreement) geschlossen und Vercel hat sich
          insbesondere durch die EU-Standard­vertrags­klauseln (SCC) im Sinne
          des Art. 46 Abs. 2 lit. c DSGVO zur Einhaltung des europäischen
          Datenschutz­niveaus verpflichtet.
        </p>
        <p>
          Weitere Informationen findest Du unter{" "}
          <a
            href="https://vercel.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://vercel.com/legal/privacy-policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="5. Registrierung und Nutzerkonto">
        <p>
          Für die Nutzung des Generators bzw. des Pro-Tarifs ist ein
          Nutzer­konto erforderlich. Im Rahmen der Registrierung verarbeiten
          wir:
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>E-Mail-Adresse,</li>
          <li>
            ein von Dir gewähltes Passwort (Speicherung ausschließlich als
            sicherer kryptografischer Hash; das Passwort im Klartext ist uns
            nicht bekannt),
          </li>
          <li>
            einen sechsstelligen Bestätigungscode, der dir per E-Mail
            zugeschickt wird (Verifizierung Deiner E-Mail-Adresse),
          </li>
          <li>
            Datum der Registrierung sowie Zeitpunkt der E-Mail-Verifizierung,
          </li>
          <li>
            ein technisches Visitor-Cookie für die Zuordnung des Free-Tageskontingents
            (siehe Ziffer 9).
          </li>
        </ul>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des
          Nutzungsvertrags) sowie für die Authentifizierung Art. 6 Abs. 1 lit. f
          DSGVO (berechtigtes Interesse an Account-Sicherheit).
        </p>
        <p>
          Die Daten werden für die Dauer des bestehenden Nutzerkontos
          gespeichert. Nach Löschung des Kontos werden Stammdaten nach Maßgabe
          gesetzlicher Aufbewahrungs­fristen (insbesondere § 257 HGB, § 147 AO)
          archiviert und im Übrigen unverzüglich gelöscht. Bestätigungs­codes
          werden 15 Minuten nach Versand für die Verifizierung gesperrt und
          anschließend zeitnah verworfen.
        </p>
      </LegalSection>

      <LegalSection title="6. Nutzung des KI-Generators">
        <p>
          Beim Erstellen einer Frage übermitteln wir Deine Eingaben (Thema,
          Schwierigkeit, Frage-Typ, Anzahl von Teilfragen) an unseren externen
          KI-Dienstleister, die{" "}
          <strong>OpenAI Ireland Limited</strong>, 1st Floor, The Liffey Trust
          Centre, 117–126 Sheriff Street Upper, Dublin 1, D01 YC43, Irland
          (für EU-Nutzer; Mutter­gesellschaft: OpenAI, L.L.C., USA, nachfolgend
          gemeinsam „<strong>OpenAI</strong>").
        </p>
        <p>
          OpenAI generiert auf Basis der von Dir bereitgestellten Themen
          Single-Choice-Fragen, Antwortoptionen und Erklärungen und liefert das
          Ergebnis an unsere Plattform zurück. Es findet kein Tracking durch
          OpenAI gegenüber Dir statt; die Verbindung erfolgt server-zu-server.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des
          Nutzungs­vertrags). Sofern Du als Free-Nutzer Eingaben tätigst, ohne
          dass ein eingeloggtes Konto besteht, ist Rechtsgrundlage auch Art. 6
          Abs. 1 lit. f DSGVO (berechtigtes Interesse, die Kernfunktion
          „Generator" bereitzustellen).
        </p>
        <p>
          Mit OpenAI besteht ein Auftrags­verarbeitungs­vertrag (Data Processing
          Addendum); für Datenflüsse in die USA gelten die
          EU-Standard­vertrags­klauseln (Art. 46 Abs. 2 lit. c DSGVO) als
          Garantie zum Schutz Deiner Daten. OpenAI hat uns gegenüber bestätigt,
          dass über die API übermittelte Inhalte standardmäßig nicht zum
          Training von Modellen verwendet werden.
        </p>
        <p>
          Weitere Informationen findest Du unter{" "}
          <a
            href="https://openai.com/policies/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://openai.com/policies/privacy-policy
          </a>
          .
        </p>
        <p>
          <strong>Hinweis:</strong> Bitte gib keine personenbezogenen Daten
          Dritter oder reale Patienten­daten in den Generator ein. Dies ist
          unsere AGB-rechtlich (§ 8 AGB) und auch datenschutz­rechtlich
          untersagt.
        </p>
      </LegalSection>

      <LegalSection title="7. Zahlungsabwicklung (Pro-Abonnement)">
        <p>
          Für die Abwicklung kostenpflichtiger Abonnements setzen wir{" "}
          <strong>Stripe Payments Europe Ltd.</strong>, Block 4, Harcourt
          Centre, Harcourt Road, Dublin 2, Irland (nachfolgend „
          <strong>Stripe</strong>") ein. Bei Buchung eines kostenpflichtigen
          Tarifs werden die für die Abwicklung notwendigen Daten – z. B. Name,
          E-Mail-Adresse, Zahlungs­mittel, Rechnungs­adresse – an Stripe
          übermittelt. Stripe ist datenschutz­rechtlich teilweise{" "}
          <strong>eigenständig Verantwortlicher</strong> und teilweise
          Auftrags­verarbeiter; Einzelheiten findest Du in den
          Datenschutz­hinweisen von Stripe.
        </p>
        <p>
          Stripe unterhält eine Konzern­struktur, die auch Datenflüsse in die
          USA umfassen kann. Zur Sicherstellung eines angemessenen Datenschutz­niveaus
          stützt sich Stripe insbesondere auf EU-Standard­vertrags­klauseln
          (Art. 46 Abs. 2 lit. c DSGVO).
        </p>
        <p>
          Rechtsgrundlage für die Übermittlung ist Art. 6 Abs. 1 lit. b DSGVO
          (Vertragserfüllung) sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
          Interesse an einer effizienten und sicheren Zahlungsabwicklung).
        </p>
        <p>
          Wir selbst speichern keine vollständigen Zahlungsmittel­daten (z. B.
          Kartennummern). Wir erhalten von Stripe lediglich die für die
          Verwaltung des Abonnements erforderlichen Status­informationen
          (z. B. Subscription-ID, Status „aktiv/gekündigt", aktuelle
          Abrechnungs­periode).
        </p>
        <p>
          Weitere Informationen unter{" "}
          <a
            href="https://stripe.com/de/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://stripe.com/de/privacy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="8. E-Mail-Versand (Verifizierung, Passwort-Reset, Service-Mails)">
        <p>
          Für transaktionale E-Mails (Versand des Bestätigungscodes,
          Passwort-Reset-Link, Mitteilungen zur Abrechnung sowie Hinweise zur
          Vertrags­abwicklung) nutzen wir einen E-Mail-Versand über{" "}
          <strong>Zoho Corporation B.V.</strong> bzw. ihre verbundenen
          Unternehmen (SMTP-Versand über die Zoho-Mail-Infrastruktur).
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des
          Nutzungs­vertrags) bzw. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
          Interesse an einer zuverlässigen Mail-Zustellung).
        </p>
        <p>
          Wir bemühen uns, die Inhalte solcher Mails sparsam zu halten; eine
          Speicherung der Mail-Inhalte oder Empfänger­adressen über die für die
          Zustellung erforderlichen Zwecke hinaus erfolgt nicht.
        </p>
      </LegalSection>

      <LegalSection title="9. Cookies und vergleichbare Technologien">
        <p>
          Wir setzen ausschließlich <strong>technisch erforderliche
          Cookies</strong> ein, die für den Betrieb der Plattform unverzichtbar
          sind. Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TDDDG (technisch
          erforderlich) bzw. Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
          Einsatz von Tracking-, Analyse- oder Marketing-Cookies findet
          derzeit nicht statt.
        </p>

        <LegalSubsection title="Eingesetzte Cookies / Session-Token:">
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>NextAuth Session-Cookie</strong> – speichert eine
              verschlüsselte Session zur Aufrechterhaltung der Anmeldung
              (typische Speicherdauer 30 Tage, erneuert sich bei Aktivität).
            </li>
            <li>
              <strong>Generator Visitor-Cookie</strong>{" "}
              („ur_gen_vid", HMAC-signiert) – ordnet anonymen Nutzern das
              tägliche Free-Kontingent zu, ohne dass eine Identifikation des
              Nutzers erfolgt. Speicherdauer: 365 Tage.
            </li>
            <li>
              <strong>Theme-Voreinstellung</strong> (local-storage) – speichert
              Deine bevorzugte Farbeinstellung (hell/dunkel).
            </li>
            <li>
              <strong>Stripe-Cookies im Checkout-Fenster</strong> – werden
              ausschließlich auf den Stripe-Checkout-Seiten gesetzt und
              unterliegen den Datenschutz­hinweisen von Stripe.
            </li>
          </ul>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="10. Schriftarten (Google Fonts – lokal eingebunden)">
        <p>
          Wir nutzen die Schriftart „Inter" über die Next.js-Font-Einbindung.
          Diese wird beim Deployment auf unsere Server bzw. die unseres Hosters
          übertragen und von dort ausgeliefert. Es findet{" "}
          <strong>keine Verbindung Deines Browsers zu Servern von Google</strong>{" "}
          statt; eine Übermittlung Deiner IP-Adresse an Google erfolgt durch die
          Nutzung der Schriftart nicht.
        </p>
      </LegalSection>

      <LegalSection title="11. Speicherdauer">
        <p>
          Wir speichern Deine personenbezogenen Daten so lange, wie es für die
          jeweils genannten Zwecke erforderlich ist, und löschen sie danach,
          sofern keine gesetzlichen Aufbewahrungs­fristen entgegenstehen
          (insbesondere § 257 HGB, § 147 AO für abrechnungs- und
          steuerrelevante Unterlagen).
        </p>
      </LegalSection>

      <LegalSection title="12. Empfänger personenbezogener Daten">
        <p>
          Eine Übermittlung Deiner personenbezogenen Daten an Dritte erfolgt nur
          an die in dieser Erklärung benannten Auftrags­verarbeiter und nur
          zweck­gebunden:
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>Vercel (Hosting der Plattform, USA-Bezug)</li>
          <li>OpenAI (KI-Generierung, USA-Bezug)</li>
          <li>Stripe (Zahlungsabwicklung, Irland und ggf. USA)</li>
          <li>Zoho (E-Mail-Versand)</li>
          <li>
            Steuerberater, Behörden, Gerichte – soweit gesetzlich erforderlich
          </li>
        </ul>
        <p>
          Eine darüber hinausgehende Weitergabe (insbesondere zu Werbezwecken)
          erfolgt nicht.
        </p>
      </LegalSection>

      <LegalSection title="13. Drittlandtransfer">
        <p>
          Soweit personenbezogene Daten an Empfänger außerhalb der Europäischen
          Union/des EWR übermittelt werden (insbesondere USA bei Vercel, OpenAI
          und ggf. Stripe), erfolgt dies auf Grundlage von{" "}
          <strong>EU-Standard­vertrags­klauseln</strong> nach Art. 46 Abs. 2
          lit. c DSGVO als geeignete Garantien zum Schutz Deiner Daten.
          Ergänzende technische und organisatorische Maßnahmen (z. B.
          Transport­verschlüsselung) werden angewandt.
        </p>
        <p>
          Hinweis: Trotz dieser Garantien können wir nicht ausschließen, dass
          US-Sicherheits­behörden auf Grundlage einschlägiger US-Vorschriften
          (z. B. FISA 702, EO 12333) Zugriff auf personenbezogene Daten
          verlangen. Soweit eine solche Datenübertragung unverzichtbar für die
          Bereitstellung des Dienstes ist (Hosting, KI-Generierung), beruht sie
          zudem auf Art. 49 Abs. 1 lit. b DSGVO.
        </p>
      </LegalSection>

      <LegalSection title="14. Deine Rechte als betroffene Person">
        <p>Du hast jederzeit das Recht,</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Auskunft</strong> über die zu Dir gespeicherten
            personen­bezogenen Daten zu erhalten (Art. 15 DSGVO),
          </li>
          <li>
            unrichtige Daten <strong>berichtigen</strong> zu lassen (Art. 16
            DSGVO),
          </li>
          <li>
            die <strong>Löschung</strong> Deiner Daten zu verlangen, soweit
            keine gesetzliche Aufbewahrungs­pflicht entgegensteht (Art. 17
            DSGVO),
          </li>
          <li>
            die <strong>Einschränkung der Verarbeitung</strong> zu verlangen
            (Art. 18 DSGVO),
          </li>
          <li>
            der Verarbeitung Deiner Daten zu <strong>widersprechen</strong>{" "}
            (Art. 21 DSGVO),
          </li>
          <li>
            die <strong>Datenübertragbarkeit</strong> Deiner Daten in einem
            strukturierten, gängigen und maschinen­lesbaren Format zu verlangen
            (Art. 20 DSGVO),
          </li>
          <li>
            eine erteilte <strong>Einwilligung</strong> jederzeit mit Wirkung
            für die Zukunft <strong>zu widerrufen</strong> (Art. 7 Abs. 3
            DSGVO),
          </li>
          <li>
            Dich bei einer <strong>Datenschutz­aufsichtsbehörde</strong> zu
            beschweren (Art. 77 DSGVO).
          </li>
        </ul>
        <p>
          Zur Ausübung deiner Rechte genügt eine formlose Mitteilung an{" "}
          <a href="mailto:info@ultima-rat.io">info@ultima-rat.io</a>.
        </p>
        <p>
          Die für uns zuständige Aufsichts­behörde ist die{" "}
          <strong>
            Landesbeauftragte für Datenschutz und Informations­freiheit
            Nordrhein-Westfalen
          </strong>
          , Kavalleriestraße 2–4, 40213 Düsseldorf,{" "}
          <a
            href="https://www.ldi.nrw.de"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.ldi.nrw.de
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="15. Pflicht zur Bereitstellung personenbezogener Daten">
        <p>
          Für den Abschluss eines Nutzungs- bzw. Pro-Vertrags ist die
          Bereitstellung der unter Ziffern 5 bis 7 genannten Daten
          erforderlich. Ohne diese Daten können wir den Vertrag nicht
          abschließen bzw. erfüllen.
        </p>
      </LegalSection>

      <LegalSection title="16. Keine automatisierte Entscheidungsfindung">
        <p>
          Eine ausschließlich automatisierte Entscheidungs­findung im Sinne
          des Art. 22 DSGVO – einschließlich Profiling – findet auf der
          Plattform nicht statt. Die KI-gestützte Generierung von
          Prüfungsfragen ist keine Entscheidung mit rechtlicher Wirkung oder
          ähnlich erheblicher Beeinträchtigung für Dich.
        </p>
      </LegalSection>

      <LegalSection title="17. Aktualität und Änderung dieser Datenschutzerklärung">
        <p>
          Wir behalten uns vor, diese Datenschutz­erklärung anzupassen, wenn
          sich die Verarbeitung oder die rechtlichen Rahmen­bedingungen ändern.
          Die jeweils aktuelle Version ist stets unter der vorliegenden URL
          abrufbar. Im Bestellprozess gilt jeweils der Stand zum Zeitpunkt des
          Vertrags­schlusses.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
