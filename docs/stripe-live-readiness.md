# Stripe Go-Live Readiness

Kompakte Checkliste und Anleitung, um die Plattform aus dem
Sandbox-/Test-Betrieb in einen verlässlichen Live-Betrieb zu überführen.

> **Hinweis:** Diese Datei beschreibt technische Schritte. Rechtliche und
> steuerliche Fragen (USt, Anbieterkennzeichnung, Widerruf, AGB, Datenschutz,
> Verbraucherinformation) sind **extern juristisch und steuerlich zu prüfen**
> und nicht Gegenstand dieser Doku.

---

## 1. Benötigte Environment-Variablen (Production)

| Name | Pflicht | Beispiel | Quelle |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | ja | `sk_live_…` | Stripe Dashboard → Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ja | `pk_live_…` | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | ja | `whsec_…` | Stripe Dashboard → Developers → Webhooks → Endpoint → Signing secret |
| `STRIPE_PRICE_ID_PRO_MONTHLY` | ja | `price_…` | Stripe Dashboard → Products → fragenkreuzen.de Pro → Pricing |
| `NEXT_PUBLIC_APP_URL` | ja | `https://fragenkreuzen.de` | App-eigene Domain |
| `ALLOW_SIMULATED_SUBSCRIPTION` | nein | `false` | Simulations-Routen in Production deaktivieren (Default: aus) |

`STRIPE_PRICE_ID` (Legacy) wird weiterhin als Fallback gelesen, sollte aber
zugunsten von `STRIPE_PRICE_ID_PRO_MONTHLY` migriert werden.

Beim ersten Stripe-Aufruf prüft `lib/stripe-config.ts` die Konfiguration und
verweigert in Production:
- Test-Keys (`sk_test_…` / `pk_test_…`)
- gemischte Modes (Live Secret + Test Publishable und umgekehrt)
- fehlendes `STRIPE_WEBHOOK_SECRET`
- fehlende `STRIPE_PRICE_ID_PRO_MONTHLY`

---

## 2. Stripe Dashboard — Live-Setup-Schritte

1. **Switch auf Live-Mode** im Dashboard (oben rechts).
2. **Produkt anlegen**: `fragenkreuzen.de Pro`
   - Recurring, monthly, `9,99 €` (oder gewählter Preis).
   - Beschreibung Generator-First (siehe Checkout-Code).
   - **Price-ID kopieren** → `STRIPE_PRICE_ID_PRO_MONTHLY`.
3. **Customer Portal aktivieren**: Stripe Dashboard → Settings → Billing → Customer Portal
   - Features aktivieren: „Update payment methods", „Cancel subscriptions",
     „Switch plans" (optional), „Invoice history".
   - Branding / Logo setzen.
4. **Webhook-Endpoint anlegen**:
   - URL: `https://<dein-host>/api/stripe/webhook`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - **Signing secret** kopieren → `STRIPE_WEBHOOK_SECRET`.
5. **Tax/Invoicing prüfen**: USt-Konfiguration, Rechnungs-Branding,
   Rechnungs-Mails → **extern steuerlich prüfen**.
6. **Branding/Checkout**: Logo, Farbe, Domain im Stripe-Dashboard hinterlegen.

---

## 3. Webhook-Architektur

- `POST /api/stripe/webhook` verifiziert die Signatur mit
  `STRIPE_WEBHOOK_SECRET` über `stripe.webhooks.constructEvent(rawBody, sig, secret)`.
- Idempotenz: vor jeder Verarbeitung wird die `event.id` in
  `StripeEventLog` reserviert (`eventId @unique`). Bereits final verarbeitete
  Events (mit `processedAt != null`) werden mit `200` quittiert und nicht
  erneut angewandt.
- Nicht aufgelöste Reservierungen (in-flight oder vorheriger Crash) werden
  beim nächsten Retry erneut verarbeitet — Stripe liefert Events stabil mit
  derselben `event.id` aus.
- Bei Handler-Fehler wird `500` zurückgegeben, damit Stripe das Event erneut
  zustellt. Der Reservierungseintrag bleibt mit `processedAt = null` zurück.

---

## 4. Subscription-Status-Mapping

Single Source of Truth: `lib/stripe-subscription-access.ts` →
`stripeSubscriptionGrantsPro(status)`.

| Stripe-Status | Pro-Zugang | Hinweis |
|---|---|---|
| `active` | ✅ | Normalfall |
| `trialing` | ✅ | nur falls Trial im Dashboard konfiguriert ist |
| `past_due` | ✅ (vorübergehend) | UI sollte Warnung anzeigen |
| `canceled` / `unpaid` / `incomplete` / `incomplete_expired` / `paused` | ❌ | kein Pro |
| `cancel_at_period_end = true` | ✅ bis `currentPeriodEnd` | Verlängerung pausiert |

`User.subscriptionStatus` (Enum `free | pro`) wird vom Webhook aus dem
Stripe-Status abgeleitet — der Client darf das niemals direkt setzen.

---

## 5. Testplan **vor** Livegang (Test-Mode)

1. **Test Checkout**: `npx stripe trigger checkout.session.completed` oder
   manueller Test-Checkout mit Stripe-Testkarten (4242 / 4000…).
2. **Webhook-Forward lokal**: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
3. **Subscription Lifecycle**:
   - `customer.subscription.updated` mit `cancel_at_period_end = true`.
   - `customer.subscription.deleted` → Pro abgezogen.
4. **Doppel-Event**: dieselbe `event.id` zweimal forwarden → erwartet
   `200 { duplicate: true }` beim zweiten Mal.
5. **Payment Failure**: `stripe trigger invoice.payment_failed` → DB-Status
   spiegelt `past_due` / `unpaid`.
6. **Customer Portal**: aus Account-UI → `Rechnungen & Zahlungsdaten`.
7. **Refund/Test Clock**: für Period-Tests Stripe Test Clock nutzen.

---

## 6. Livegang-Checkliste

- [ ] Live API Keys gesetzt (`sk_live_…`, `pk_live_…`)
- [ ] Keine Test-Keys mehr in der Production-Env
- [ ] `STRIPE_PRICE_ID_PRO_MONTHLY` zeigt auf Live-Product
- [ ] `STRIPE_WEBHOOK_SECRET` ist Live-Webhook-Signing-Secret
- [ ] `NEXT_PUBLIC_APP_URL` zeigt auf finale Domain
- [ ] `ALLOW_SIMULATED_SUBSCRIPTION` ist nicht gesetzt oder `false`
- [ ] Webhook-Endpoint im Stripe-Dashboard angelegt + Events ausgewählt
- [ ] Customer Portal im Stripe-Dashboard aktiviert und gebrandet
- [ ] Tax/USt im Stripe-Dashboard final (**extern prüfen**)
- [ ] Rechnungs-Branding + Rechnungs-Mails geprüft (**extern prüfen**)
- [ ] Rechtsseiten final: Impressum, Datenschutz, AGB, Widerruf (**extern juristisch prüfen**)
- [ ] Preisangabe inkl. USt (Brutto) korrekt (**extern prüfen**)
- [ ] Monitoring/Logs aktiv, PII nicht in Logs
- [ ] Live-Smoke-Test mit Test-Karte (Stripe Live Test Cards in echtem
      Live-Modus) — **niemals** echte Karten

---

## 7. Rollback-Plan

Bei kritischem Problem im Live-Betrieb:

1. **Checkout deaktivieren**: Entferne `STRIPE_PRICE_ID_PRO_MONTHLY` aus
   Env oder ersetze durch ungültigen Wert. → Checkout liefert sauberen
   `stripe_misconfigured`-Fehler.
2. **Webhook deaktivieren** im Stripe Dashboard → Webhook → Disable.
3. **Live-Keys auf Test-Keys zurücksetzen** (nur Notfall, alle Live-User
   würden danach den Test-Mode sehen).
4. **Pro-Status manuell** über DB-Admin prüfen / korrigieren — keine
   Selbst-Aktivierung über die UI; sämtliche Statusänderungen müssen über
   verifizierte Stripe-Events laufen.

---

## 8. Bekannte extern zu prüfende Punkte

Diese Punkte sind **nicht** Teil des Codes und müssen vor Livegang separat
geprüft werden:

- **Rechtsseiten**: Impressum, Datenschutz (inkl. Hinweis auf Stripe als
  Zahlungsdienstleister/Drittland-Datenfluss), AGB, Widerrufsbelehrung für
  digitale Inhalte/Abos.
- **Steuerliches**: USt-Pflicht, Reverse-Charge, Kleinunternehmerregelung,
  Rechnungspflichten, OSS.
- **Verbraucherschutz**: Preisangabenverordnung, klare Hinweise auf monatliche
  Kosten und Kündigung, „Jetzt zahlungspflichtig bestellen"-Button-Beschriftung.
- **Datenschutz**: Auftragsverarbeitungsvertrag mit Stripe, Cookie-Banner,
  TTDSG/DSGVO-Anforderungen.
- **Medizinischer Disclaimer**: „Nur zu Lernzwecken, keine medizinische
  Beratung." sichtbar platzieren.

---

## 9. Schlanke FAQ für Operations

**„Webhook liefert 500 zurück — was tun?"**
→ Stripe retried automatisch. Logs prüfen, `StripeEventLog` enthält die
   `eventId`. Bei strukturellem Bug Eintrag löschen und Replay aus dem
   Stripe-Dashboard auslösen.

**„Pro nicht aktiviert obwohl Zahlung erfolgreich?"**
→ Stripe-Dashboard → Subscription suchen. Sicherstellen, dass Webhook-Endpoint
   `customer.subscription.created` empfängt. Ggf. manuell „Resend event".

**„User behauptet, er sei Pro, ist es aber nicht."**
→ `User.subscriptionStatus` ist der Cache. `Subscription` Tabelle ist die
   Wahrheit. Ggf. Webhook nachholen.
