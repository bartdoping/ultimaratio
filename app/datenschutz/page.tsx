import type { Metadata } from "next"
import Link from "next/link"
import {
  LegalShell,
  LegalSection,
  LegalSubsection,
} from "@/components/legal/legal-shell"
import { CookieSettingsLink } from "@/components/consent/consent-banner"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Datenschutzerklärung | fragenkreuzen.de",
  description:
    "Informationen zur Verarbeitung personenbezogener Daten gemäß Art. 13 und 14 DSGVO auf fragenkreuzen.de – inklusive Hosting, KI-Generator, Zahlungsabwicklung, Cookies, Analyse und Werbung.",
}

export default function DatenschutzPage() {
  return (
    <LegalShell
      title="Datenschutzerklärung"
      description="Informationen zur Verarbeitung personenbezogener Daten gemäß Art. 13 und 14 DSGVO."
      lastUpdated="20. August 2026"
    >
      <LegalSection title="1. Datenschutz auf einen Blick">
        <LegalSubsection title="Allgemeine Hinweise">
          <p>
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit
            deinen personenbezogenen Daten passiert, wenn du diese Website besuchst
            und nutzt. Personenbezogene Daten sind alle Daten, mit denen du
            persönlich identifiziert werden kannst. Ausführliche Informationen
            findest du in den nachfolgenden Abschnitten.
          </p>
        </LegalSubsection>

        <LegalSubsection title="Wer ist verantwortlich für die Datenerfassung?">
          <p>
            Die Datenverarbeitung auf dieser Website erfolgt durch die
            Website­betreiberin. Ihre Kontaktdaten findest du in Abschnitt 2
            („Verantwortliche Stelle").
          </p>
        </LegalSubsection>

        <LegalSubsection title="Wie erfassen wir deine Daten?">
          <p>
            Ein Teil deiner Daten wird dadurch erhoben, dass du sie uns mitteilst –
            zum Beispiel bei der Registrierung eines Nutzerkontos, beim Abschluss
            eines Pro-Abonnements, bei einer Kündigung oder bei einer Kontaktaufnahme
            per E-Mail. Andere Daten werden automatisch oder nach deiner Einwilligung
            beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor
            allem technische Daten (z. B. Browser, Betriebssystem, Uhrzeit des
            Seitenaufrufs).
          </p>
        </LegalSubsection>

        <LegalSubsection title="Wofür nutzen wir deine Daten?">
          <p>
            Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der
            Website zu gewährleisten. Weitere Daten verarbeiten wir zur Erbringung
            unseres Dienstes: Erstellung und Verwaltung deines Nutzerkontos,
            Generierung von Übungsfragen, Abwicklung des Pro-Abonnements sowie zur
            Erfüllung gesetzlicher Pflichten. Analyse- und Werbedienste setzen wir
            ausschließlich mit deiner Einwilligung ein.
          </p>
        </LegalSubsection>

        <LegalSubsection title="Welche Rechte hast du?">
          <p>
            Du hast jederzeit das Recht, unentgeltlich Auskunft über Herkunft,
            Empfänger und Zweck deiner gespeicherten personenbezogenen Daten zu
            erhalten. Außerdem hast du ein Recht auf Berichtigung oder Löschung
            dieser Daten sowie unter bestimmten Voraussetzungen auf Einschränkung der
            Verarbeitung und auf Datenübertragbarkeit. Eine erteilte Einwilligung
            kannst du jederzeit mit Wirkung für die Zukunft widerrufen. Dir steht
            zudem ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu
            (Abschnitt 14).
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="2. Verantwortliche Stelle">
        <p>
          Verantwortlich für die Datenverarbeitung auf dieser Website ist:
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
          E-Mail: <a href="mailto:info@ultima-rat.io">info@ultima-rat.io</a>
        </p>
        <p>
          Vertretungsberechtigte Gesellschafter: Ahkash Thavarajasingam und Mustafa
          Magdy Abdel Razik Mahmoud Eid.
        </p>
        <p>
          Verantwortliche Stelle ist die natürliche oder juristische Person, die
          allein oder gemeinsam mit anderen über die Zwecke und Mittel der
          Verarbeitung von personenbezogenen Daten entscheidet.
        </p>
        <p>
          Ein Datenschutzbeauftragter ist gesetzlich nicht zu benennen, da die
          Voraussetzungen des Art. 37 DSGVO in Verbindung mit § 38 BDSG nicht
          vorliegen. Für alle Anliegen zum Datenschutz erreichst du uns unter der
          oben genannten Adresse.
        </p>
      </LegalSection>

      <LegalSection title="3. Allgemeine Hinweise und Pflichtinformationen">
        <LegalSubsection title="Rechtsgrundlagen der Verarbeitung">
          <p>
            Soweit du in die Verarbeitung eingewilligt hast, verarbeiten wir deine
            Daten auf Grundlage von <strong>Art. 6 Abs. 1 lit. a DSGVO</strong>.
            Soweit die Verarbeitung zur Erfüllung eines Vertrags oder zur
            Durchführung vorvertraglicher Maßnahmen erforderlich ist, stützen wir sie
            auf <strong>Art. 6 Abs. 1 lit. b DSGVO</strong>. Zur Erfüllung
            rechtlicher Verpflichtungen verarbeiten wir Daten auf Grundlage von{" "}
            <strong>Art. 6 Abs. 1 lit. c DSGVO</strong>. Im Übrigen kann die
            Verarbeitung auf unserem berechtigten Interesse nach{" "}
            <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> beruhen. Die jeweils
            einschlägige Rechtsgrundlage nennen wir bei den einzelnen Verarbeitungen.
          </p>
        </LegalSubsection>

        <LegalSubsection title="Empfänger personenbezogener Daten">
          <p>
            Im Rahmen unserer Geschäftstätigkeit arbeiten wir mit externen
            Dienstleistern zusammen. Personenbezogene Daten geben wir nur weiter,
            wenn dies zur Vertragserfüllung erforderlich ist, wir gesetzlich dazu
            verpflichtet sind, ein berechtigtes Interesse besteht oder eine sonstige
            Rechtsgrundlage die Weitergabe erlaubt. Setzen wir Auftragsverarbeiter
            ein, geschieht dies ausschließlich auf Grundlage eines Vertrags über
            Auftragsverarbeitung nach Art. 28 DSGVO.
          </p>
          <p>Konkret sind das:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>Vercel Inc.</strong> – Hosting und Auslieferung der Website
              (Abschnitt 4)
            </li>
            <li>
              <strong>OpenAI Ireland Ltd.</strong> – KI-Fragengenerierung
              (Abschnitt 7)
            </li>
            <li>
              <strong>Stripe Payments Europe, Ltd.</strong> – Zahlungsabwicklung
              (Abschnitt 8)
            </li>
            <li>
              <strong>Zoho Corporation B.V.</strong> – Versand unserer System-E-Mails
              (Abschnitt 9)
            </li>
            <li>
              <strong>Google Ireland Limited</strong> – Analyse und Werbung, nur mit
              deiner Einwilligung (Abschnitt 11)
            </li>
          </ul>
        </LegalSubsection>

        <LegalSubsection title="Datenübermittlung in Drittländer">
          <p>
            Wir setzen unter anderem Dienste ein, deren Mutterkonzerne in den USA
            sitzen (Vercel, OpenAI, Stripe, Google). Dabei können personenbezogene
            Daten in die USA übermittelt und dort verarbeitet werden. Die
            Übermittlung erfolgt, soweit der jeweilige Anbieter nach dem{" "}
            <strong>EU-U.S. Data Privacy Framework</strong> zertifiziert ist, auf
            Grundlage des Angemessenheits­beschlusses der EU-Kommission
            (Art. 45 DSGVO). Ergänzend stützen wir die Übermittlung auf die{" "}
            <strong>Standardvertragsklauseln</strong> der EU-Kommission
            (Art. 46 Abs. 2 lit. c DSGVO) einschließlich zusätzlicher
            Schutzmaßnahmen.
          </p>
          <p>
            Wir weisen darauf hin, dass in den USA trotz dieser Garantien ein
            Zugriff durch staatliche Stellen nicht vollständig ausgeschlossen werden
            kann und dir gegebenenfalls nicht dieselben Rechtsbehelfe wie innerhalb
            der EU zur Verfügung stehen.
          </p>
        </LegalSubsection>

        <LegalSubsection title="Widerruf deiner Einwilligung">
          <p>
            Viele Verarbeitungsvorgänge sind nur mit deiner ausdrücklichen
            Einwilligung möglich. Du kannst eine erteilte Einwilligung jederzeit mit
            Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3 DSGVO). Die
            Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt
            unberührt. Deine Cookie-Einwilligung änderst du jederzeit über den Link{" "}
            <CookieSettingsLink className="underline underline-offset-4 hover:text-foreground" />{" "}
            im Footer.
          </p>
        </LegalSubsection>

        <LegalSubsection title="Widerspruchsrecht (Art. 21 DSGVO)">
          <p className="uppercase">
            Wenn die Datenverarbeitung auf Grundlage von Art. 6 Abs. 1 lit. e oder
            lit. f DSGVO erfolgt, hast du jederzeit das Recht, aus Gründen, die sich
            aus deiner besonderen Situation ergeben, gegen die Verarbeitung deiner
            personenbezogenen Daten Widerspruch einzulegen. Legst du Widerspruch ein,
            verarbeiten wir deine betroffenen personenbezogenen Daten nicht mehr, es
            sei denn, wir können zwingende schutzwürdige Gründe für die Verarbeitung
            nachweisen, die deine Interessen, Rechte und Freiheiten überwiegen, oder
            die Verarbeitung dient der Geltendmachung, Ausübung oder Verteidigung von
            Rechtsansprüchen.
          </p>
        </LegalSubsection>

        <LegalSubsection title="SSL- bzw. TLS-Verschlüsselung">
          <p>
            Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung
            vertraulicher Inhalte – etwa deiner Zugangsdaten – eine SSL- bzw.
            TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennst du daran,
            dass die Adresszeile des Browsers mit „https://" beginnt und ein
            Schloss-Symbol angezeigt wird.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="4. Hosting (Vercel)">
        <p>
          Wir hosten unsere Website bei <strong>Vercel Inc.</strong>, 440 N Barranca
          Ave #4133, Covina, CA 91723, USA. Beim Aufruf unserer Website erfasst
          Vercel als technischer Dienstleister automatisch Verbindungsdaten
          einschließlich deiner IP-Adresse.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Wir haben ein berechtigtes
          Interesse an einer zuverlässigen, sicheren und performanten Bereitstellung
          unserer Website. Soweit Vercel Daten in unserem Auftrag verarbeitet, haben
          wir mit Vercel einen Vertrag über Auftragsverarbeitung nach Art. 28 DSGVO
          geschlossen.
        </p>
        <p>
          Vercel Inc. ist nach dem EU-U.S. Data Privacy Framework zertifiziert;
          ergänzend gelten die Standardvertragsklauseln der EU-Kommission. Näheres in
          der Datenschutzerklärung von Vercel:{" "}
          <a
            href="https://vercel.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            vercel.com/legal/privacy-policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="5. Server-Log-Dateien">
        <p>
          Der Provider der Seiten erhebt und speichert automatisch Informationen in
          Server-Log-Dateien, die dein Browser automatisch übermittelt:
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>Browsertyp und Browserversion</li>
          <li>verwendetes Betriebssystem</li>
          <li>Referrer-URL</li>
          <li>Hostname des zugreifenden Rechners</li>
          <li>Uhrzeit der Serveranfrage</li>
          <li>IP-Adresse</li>
        </ul>
        <p>
          Eine Zusammenführung dieser Daten mit anderen Datenquellen nehmen wir nicht
          vor. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; wir haben ein
          berechtigtes Interesse an der technisch fehlerfreien Darstellung, der
          Sicherheit und der Optimierung unserer Website. Die Logdaten werden nach
          spätestens 30 Tagen gelöscht oder anonymisiert, sofern sie nicht
          ausnahmsweise zur Aufklärung eines konkreten Sicherheits­vorfalls benötigt
          werden.
        </p>
      </LegalSection>

      <LegalSection title="6. Registrierung, Nutzerkonto und Nutzungsdaten">
        <p>
          Für die volle Nutzung des Fragen-Generators kannst du ein Nutzerkonto
          anlegen. Dabei verarbeiten wir:
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>E-Mail-Adresse (Pflichtangabe, dient als Login)</li>
          <li>Vor- und Nachname</li>
          <li>
            Passwort – ausschließlich als kryptografischer Hash gespeichert, für uns
            nicht im Klartext einsehbar
          </li>
          <li>Zeitpunkt der Registrierung und der E-Mail-Bestätigung</li>
          <li>
            Nutzungsdaten zur Erbringung des Dienstes: gewählter Tarif, Anzahl der
            täglichen Generierungen, gespeicherte Generator-Voreinstellungen
            (Presets), Lern-Serien („Streak") sowie – falls du sie nutzt –
            Prüfungsversuche und Lernstände
          </li>
          <li>
            optionale Angaben aus dem Onboarding (angestrebtes Examen, Semester)
          </li>
          <li>deine Anzeigeeinstellungen (z. B. Schriftgröße)</li>
        </ul>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Durchführung des
          Nutzungsverhältnisses). Die Daten speichern wir, solange dein Nutzerkonto
          besteht. Du kannst dein Konto jederzeit selbst im Bereich{" "}
          <Link href="/account">Account</Link> löschen oder die Löschung per E-Mail an{" "}
          <a href="mailto:info@ultima-rat.io">info@ultima-rat.io</a> verlangen. Nach
          der Löschung entfernen wir deine Daten, soweit keine gesetzlichen
          Aufbewahrungsfristen entgegenstehen (siehe Abschnitt 13).
        </p>
      </LegalSection>

      <LegalSection title="7. KI-gestützte Fragengenerierung (OpenAI)">
        <p>
          Kernfunktion unserer Plattform ist die Generierung medizinischer
          Übungsfragen mithilfe künstlicher Intelligenz. Hierfür nutzen wir die
          Programmier­schnittstelle (API) von <strong>OpenAI</strong>. Anbieter für
          Nutzer im Europäischen Wirtschaftsraum ist die OpenAI Ireland Ltd, 1st
          Floor, The Liffey Trust Centre, 117–126 Sheriff Street Upper, Dublin 1,
          Irland.
        </p>
        <p>
          Wenn du eine Frage generierst, übermitteln wir die von dir gewählten
          Parameter – insbesondere Thema, Schwierigkeitsgrad und Fragetyp – an
          OpenAI, um die Frage zu erzeugen. Wir übermitteln dabei{" "}
          <strong>keine Daten, die dich als Person identifizieren</strong>;
          insbesondere werden dein Name und deine E-Mail-Adresse nicht an OpenAI
          weitergegeben. Eine Übermittlung technischer Verbindungsdaten (z. B.
          IP-Adresse unseres Servers) an OpenAI lässt sich technisch nicht
          vollständig ausschließen.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, da die Fragengenerierung
          die von dir angeforderte vertragliche Hauptleistung darstellt. Mit OpenAI
          besteht ein Vertrag über Auftragsverarbeitung (Data Processing Addendum)
          einschließlich der Standardvertragsklauseln der EU-Kommission. Nach den
          API-Bedingungen von OpenAI werden über die API übermittelte Inhalte
          standardmäßig <strong>nicht</strong> zum Training der Modelle verwendet.
          Näheres:{" "}
          <a
            href="https://openai.com/policies/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            openai.com/policies/privacy-policy
          </a>
          .
        </p>
        <p>
          <strong>Hinweis:</strong> Die generierten Inhalte werden automatisiert
          durch ein KI-Sprachmodell erstellt und können trotz sorgfältiger
          Konfiguration fachliche Fehler enthalten. Sie dienen ausschließlich
          Lernzwecken und stellen keine medizinische Beratung dar.
        </p>
      </LegalSection>

      <LegalSection title="8. Zahlungsabwicklung (Stripe)">
        <p>
          Für die Abwicklung kostenpflichtiger Abonnements nutzen wir den
          Zahlungsdienstleister <strong>Stripe Payments Europe, Ltd.</strong>, 1
          Grand Canal Street Lower, Grand Canal Dock, Dublin, Irland.
        </p>
        <p>
          Schließt du ein Pro-Abonnement ab, werden die für die Zahlungsabwicklung
          erforderlichen Daten (z. B. Name, E-Mail-Adresse, Zahlungsmittel,
          Rechnungsdaten) unmittelbar von Stripe erhoben und verarbeitet. Deine
          vollständigen Zahlungsdaten – etwa die Kreditkartennummer – werden{" "}
          <strong>nicht auf unseren Servern gespeichert</strong>. Wir erhalten von
          Stripe lediglich die zur Vertragsdurchführung nötigen Angaben, insbesondere
          eine Kunden- und Abonnement-Kennung sowie Status und Laufzeit des
          Abonnements.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragsabwicklung) sowie,
          soweit es um Betrugsprävention und die Sicherheit des Zahlungsvorgangs
          geht, Art. 6 Abs. 1 lit. f DSGVO. Es kann zu einer Übermittlung an die
          Stripe, Inc. in den USA kommen; diese ist nach dem EU-U.S. Data Privacy
          Framework zertifiziert, ergänzend gelten die Standardvertragsklauseln.
          Näheres:{" "}
          <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer">
            stripe.com/de/privacy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="9. E-Mail-Versand">
        <p>
          Für den Versand von System-E-Mails (Bestätigung der Registrierung,
          Passwort-Zurücksetzung, Kündigungsbestätigung, wichtige Service-Hinweise)
          nutzen wir einen E-Mail-Dienstleister der{" "}
          <strong>Zoho Corporation B.V.</strong>, Beneluxlaan 4B, 3527 HT Utrecht,
          Niederlande. Dabei werden deine E-Mail-Adresse und der Inhalt der
          jeweiligen Nachricht verarbeitet.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit die E-Mail der
          Vertragsdurchführung dient, im Übrigen Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse an einem zuverlässigen technischen Betrieb). Ein
          Vertrag über Auftragsverarbeitung besteht.
        </p>
      </LegalSection>

      <LegalSection title="10. Kontaktaufnahme, Feedback und Kündigungen">
        <LegalSubsection title="Anfragen per E-Mail oder Feedback-Funktion">
          <p>
            Wenn du uns per E-Mail kontaktierst oder unsere Feedback-Funktion nutzt,
            verarbeiten wir deine Angaben (Nachricht, Kategorie, gegebenenfalls
            E-Mail-Adresse) sowie technische Kontextdaten (aufgerufene Seite,
            Browserkennung) zur Bearbeitung deines Anliegens. Rechtsgrundlage ist
            Art. 6 Abs. 1 lit. b DSGVO, sofern deine Anfrage mit einem Vertrag
            zusammenhängt, sonst Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
            an der Bearbeitung von Anfragen und der Verbesserung unseres Dienstes).
            Wir löschen diese Daten, wenn sie zur Bearbeitung nicht mehr erforderlich
            sind, spätestens nach drei Jahren, sofern keine gesetzlichen
            Aufbewahrungs­pflichten bestehen.
          </p>
        </LegalSubsection>

        <LegalSubsection title="Kündigungserklärungen über den Kündigungsbutton">
          <p>
            Kündigst du über unsere Seite{" "}
            <Link href="/kuendigung">Verträge hier kündigen</Link>, verarbeiten wir
            die von dir gemachten Angaben (E-Mail-Adresse, optional Name, Art der
            Kündigung, gewünschter Beendigungszeitpunkt, bei außerordentlicher
            Kündigung der Grund) sowie den Zeitpunkt des Zugangs, eine gekürzte bzw.
            gehashte Form deiner IP-Adresse und deine Browserkennung.
          </p>
          <p>
            Diese Protokollierung ist gesetzlich vorgeschrieben: Nach{" "}
            <strong>§ 312k Abs. 2 BGB</strong> müssen wir dir den Zugang deiner
            Kündigung mit Datum und Uhrzeit in Textform bestätigen und den Inhalt
            deiner Erklärung dokumentieren. Rechtsgrundlage ist daher Art. 6 Abs. 1
            lit. c DSGVO (Erfüllung einer rechtlichen Verpflichtung) sowie Art. 6
            Abs. 1 lit. b DSGVO (Durchführung des Vertragsverhältnisses). Wir
            bewahren Kündigungsnachweise für die Dauer der gesetzlichen
            Verjährungs- und Aufbewahrungsfristen auf.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="11. Cookies und Einwilligungsverwaltung">
        <LegalSubsection title="Technisch notwendige Cookies">
          <p>
            Wir setzen Cookies ein, um die Anmeldung an deinem Nutzerkonto zu
            ermöglichen (Session- und Authentifizierungs-Cookies), um deine Sitzung
            abzusichern (z. B. Schutz vor Cross-Site-Request-Forgery), um unsere
            Systeme vor missbräuchlicher Nutzung zu schützen (Zählung der
            Generierungen, Rate-Limiting) sowie um deine Cookie-Auswahl und deine
            Anzeigeeinstellungen zu speichern.
          </p>
          <p>
            Diese Cookies sind für die Bereitstellung der von dir ausdrücklich
            gewünschten Funktionen unbedingt erforderlich. Ihre Speicherung erfolgt
            auf Grundlage von <strong>§ 25 Abs. 2 Nr. 2 TDDDG</strong>; die
            zugehörige Datenverarbeitung stützt sich auf Art. 6 Abs. 1 lit. b DSGVO
            (Vertragserfüllung) bzw. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
            Interesse an einem sicheren und funktionsfähigen Dienst). Eine
            Einwilligung ist hierfür nicht erforderlich.
          </p>
        </LegalSubsection>

        <LegalSubsection title="Einwilligungspflichtige Cookies und Einwilligungsbanner">
          <p>
            Cookies und vergleichbare Technologien zu Analyse- und Werbezwecken
            (Abschnitt 12) setzen wir <strong>ausschließlich</strong> ein, wenn du
            über unser Einwilligungsbanner aktiv eingewilligt hast. Rechtsgrundlage
            ist Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG. Ohne deine
            Einwilligung werden diese Dienste nicht geladen und es werden keine
            entsprechenden Cookies gesetzt.
          </p>
          <p>
            Deine Auswahl speichern wir in einem technisch notwendigen Cookie, damit
            sie bei künftigen Besuchen nicht erneut abgefragt werden muss und wir
            unsere Nachweispflicht nach Art. 7 Abs. 1 DSGVO erfüllen können. Du
            kannst deine Entscheidung jederzeit mit Wirkung für die Zukunft ändern
            oder widerrufen:{" "}
            <CookieSettingsLink className="underline underline-offset-4 hover:text-foreground" />
            . Zusätzlich übermitteln wir deinen Einwilligungsstatus über den{" "}
            <strong>Google Consent Mode</strong> an Google, damit Google-Dienste
            deine Entscheidung respektieren.
          </p>
          <p>
            Session-Cookies werden nach Ende deiner Sitzung bzw. nach Abmeldung
            automatisch gelöscht; sonstige Cookies verfallen spätestens nach Ablauf
            ihrer Gültigkeitsdauer. Du kannst deinen Browser zudem so einstellen,
            dass Cookies blockiert oder gelöscht werden – in diesem Fall kann die
            Funktionalität dieser Website eingeschränkt sein.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="12. Analyse und Werbung">
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
          Die in diesem Abschnitt beschriebenen Dienste werden erst nach deiner
          aktiven Einwilligung geladen. Hast du nicht eingewilligt oder deine
          Einwilligung widerrufen, findet keine der hier beschriebenen
          Verarbeitungen statt.
        </p>

        <LegalSubsection title="Google Analytics 4">
          <p>
            Diese Website nutzt bei entsprechender Einwilligung den
            Webanalysedienst <strong>Google Analytics 4</strong>. Anbieter ist die
            Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland.
          </p>
          <p>
            Google Analytics ermöglicht uns, die Nutzung unserer Plattform zu
            analysieren – etwa Seitenaufrufe, Verweildauer, verwendete Endgeräte und
            die Herkunft der Zugriffe. Dabei kommen Technologien zum Einsatz, die
            eine Wiedererkennung deines Endgeräts ermöglichen (insbesondere
            Cookies). Bei Google Analytics 4 ist die Kürzung von IP-Adressen
            standardmäßig aktiviert; deine IP-Adresse wird vor der Speicherung
            gekürzt. Eine Zusammenführung mit deinem Nutzerkonto bei uns findet nicht
            statt.
          </p>
          <p>
            Rechtsgrundlage ist ausschließlich deine Einwilligung nach Art. 6 Abs. 1
            lit. a DSGVO und § 25 Abs. 1 TDDDG. Mit Google besteht ein Vertrag über
            Auftragsverarbeitung. Eine Datenübermittlung in die USA kann nicht
            ausgeschlossen werden; die Google LLC ist nach dem EU-U.S. Data Privacy
            Framework zertifiziert, ergänzend gelten die Standardvertragsklauseln.
            Die mit Cookies verknüpften Daten werden nach spätestens{" "}
            <strong>14 Monaten</strong> automatisch gelöscht. Näheres:{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              policies.google.com/privacy
            </a>
            .
          </p>
        </LegalSubsection>

        <LegalSubsection title="Google Ads und Conversion-Tracking">
          <p>
            Bei entsprechender Einwilligung nutzen wir <strong>Google Ads</strong>,
            ein Online-Werbeprogramm der Google Ireland Limited. Google Ads
            ermöglicht es uns, Werbeanzeigen in der Google-Suche und auf
            Drittwebsites auszuspielen.
          </p>
          <p>
            Im Rahmen von Google Ads setzen wir das sogenannte Conversion-Tracking
            ein. Klickst du auf eine von uns geschaltete Anzeige, wird ein Cookie
            für das Conversion-Tracking gesetzt. Besuchst du anschließend bestimmte
            Seiten unserer Website, können Google und wir erkennen, dass du über eine
            Anzeige zu uns gelangt bist. Wir erfahren dabei lediglich die
            Gesamtanzahl der Nutzer, die auf unsere Anzeige geklickt haben; wir
            erhalten <strong>keine</strong> Informationen, mit denen sich einzelne
            Personen identifizieren lassen.
          </p>
          <p>
            Rechtsgrundlage ist ausschließlich deine Einwilligung nach Art. 6 Abs. 1
            lit. a DSGVO und § 25 Abs. 1 TDDDG. Ohne Einwilligung werden keine
            Werbe-Cookies gesetzt; über den Google Consent Mode wird Google in diesem
            Fall signalisiert, dass keine Einwilligung vorliegt. Für die
            Datenübermittlung in die USA gelten die oben genannten Garantien.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="13. Speicherdauer">
        <p>
          Soweit in dieser Datenschutzerklärung keine speziellere Speicherdauer
          genannt ist, verbleiben deine personenbezogenen Daten bei uns, bis der
          Zweck der Verarbeitung entfällt. Machst du ein berechtigtes Löschersuchen
          geltend oder widerrufst du eine Einwilligung, werden deine Daten gelöscht,
          sofern wir keine anderen rechtlich zulässigen Gründe für die Speicherung
          haben.
        </p>
        <p>Konkret gilt insbesondere:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Nutzerkonto:</strong> bis zur Löschung des Kontos
          </li>
          <li>
            <strong>Server-Logs:</strong> in der Regel 30 Tage
          </li>
          <li>
            <strong>Rechnungs- und Buchungsbelege:</strong> 10 Jahre (§ 147 AO,
            § 257 HGB)
          </li>
          <li>
            <strong>Sonstige Handelsbriefe (z. B. Vertragskorrespondenz):</strong> 6
            Jahre
          </li>
          <li>
            <strong>Kündigungsnachweise:</strong> für die Dauer der gesetzlichen
            Verjährungs- und Aufbewahrungsfristen
          </li>
          <li>
            <strong>Google-Analytics-Daten:</strong> maximal 14 Monate
          </li>
          <li>
            <strong>Cookie-Einwilligung:</strong> 6 Monate, danach erneute Abfrage
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="14. Deine Rechte als betroffene Person">
        <p>Dir stehen gegenüber uns folgende Rechte zu:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Auskunft</strong> über die zu dir verarbeiteten Daten
            (Art. 15 DSGVO)
          </li>
          <li>
            <strong>Berichtigung</strong> unrichtiger Daten (Art. 16 DSGVO)
          </li>
          <li>
            <strong>Löschung</strong> deiner Daten (Art. 17 DSGVO)
          </li>
          <li>
            <strong>Einschränkung</strong> der Verarbeitung (Art. 18 DSGVO)
          </li>
          <li>
            <strong>Datenübertragbarkeit</strong> in einem gängigen,
            maschinenlesbaren Format (Art. 20 DSGVO)
          </li>
          <li>
            <strong>Widerspruch</strong> gegen bestimmte Verarbeitungen
            (Art. 21 DSGVO)
          </li>
          <li>
            <strong>Widerruf</strong> erteilter Einwilligungen mit Wirkung für die
            Zukunft (Art. 7 Abs. 3 DSGVO)
          </li>
        </ul>
        <p>
          Zur Ausübung deiner Rechte genügt eine formlose Nachricht an{" "}
          <a href="mailto:info@ultima-rat.io">info@ultima-rat.io</a>.
        </p>
        <LegalSubsection title="Beschwerderecht bei der Aufsichtsbehörde">
          <p>
            Unbeschadet anderweitiger Rechtsbehelfe steht dir ein Beschwerderecht bei
            einer Datenschutz-Aufsichtsbehörde zu, insbesondere im Mitgliedstaat
            deines gewöhnlichen Aufenthalts, deines Arbeitsplatzes oder des Orts des
            mutmaßlichen Verstoßes. Die für uns zuständige Behörde ist:
          </p>
          <p>
            <strong>
              Landesbeauftragte für Datenschutz und Informationsfreiheit
              Nordrhein-Westfalen (LDI NRW)
            </strong>
            <br />
            Kavalleriestraße 2–4, 40213 Düsseldorf
            <br />
            <a href="https://www.ldi.nrw.de" target="_blank" rel="noopener noreferrer">
              www.ldi.nrw.de
            </a>
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="15. Schriftarten (Google Fonts, lokal gehostet)">
        <p>
          Zur einheitlichen Darstellung von Schriftarten nutzen wir Google Fonts, die{" "}
          <strong>lokal auf unserem Server eingebunden</strong> sind. Eine Verbindung
          zu Servern von Google findet dabei nicht statt; es werden keine Daten an
          Google übertragen.
        </p>
      </LegalSection>

      <LegalSection title="16. Pflicht zur Bereitstellung von Daten">
        <p>
          Die Bereitstellung deiner E-Mail-Adresse und eines Passworts ist für die
          Einrichtung eines Nutzerkontos erforderlich; ohne diese Angaben können wir
          kein Konto anlegen. Für den Abschluss eines Pro-Abonnements sind zusätzlich
          die von Stripe erhobenen Zahlungsdaten erforderlich. Die Nutzung des
          kostenlosen Testzugangs ohne Konto ist demgegenüber ohne Angabe
          personenbezogener Daten möglich.
        </p>
      </LegalSection>

      <LegalSection title="17. Keine automatisierte Entscheidungsfindung">
        <p>
          Eine automatisierte Entscheidungsfindung einschließlich Profiling im Sinne
          des Art. 22 DSGVO, die dir gegenüber rechtliche Wirkung entfaltet oder dich
          in ähnlicher Weise erheblich beeinträchtigt, findet nicht statt. Die
          KI-gestützte Fragengenerierung erzeugt ausschließlich Lerninhalte und
          trifft keine Entscheidungen über dich.
        </p>
      </LegalSection>

      <LegalSection title="18. Aktualität und Änderung dieser Datenschutzerklärung">
        <p>
          Diese Datenschutzerklärung hat den Stand <strong>20. August 2026</strong>.
          Durch die Weiterentwicklung unserer Plattform oder aufgrund geänderter
          gesetzlicher Vorgaben kann es notwendig werden, diese Erklärung anzupassen.
          Die jeweils aktuelle Fassung findest du stets auf dieser Seite.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
