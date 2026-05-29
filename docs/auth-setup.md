# Auth-Setup für fragenkreuzen.de

Diese Doku erklärt, wie der neue Auth-Flow konfiguriert und mit optionalen
OAuth-Providern + Cloudflare Turnstile betrieben wird.

## Architektur in Kürze

- **NextAuth v4** mit JWT-Sessions, Login-Page: `/login`.
- **E-Mail-first-Wizard**: User gibt zuerst nur die E-Mail-Adresse ein, der
  Server entscheidet (existierender Account → Passwort-Schritt, neuer
  Account → Passwort-festlegen + 6-stelliger E-Mail-Bestätigungscode).
- **Vorname/Nachname werden NICHT mehr abgefragt**. Im DB-Schema sind die
  Spalten weiterhin `String` (Pflicht) — wir speichern leere Strings, ohne
  Bestandsnutzer zu beschädigen.
- **OAuth-Provider** sind alle optional. Nur per Env konfigurierte Provider
  tauchen im Login-UI auf.
- **Rate-Limits** (in-memory, best-effort): Check-Email, Register,
  Code-Resend, Code-Verify, Reset-Request.
- **Captcha (Turnstile)** wird ausschließlich auf dem **Registrierungs-Schritt**
  gerendert, sofern konfiguriert.

## Pflicht-Environment

```bash
NEXTAUTH_URL="https://fragenkreuzen.de"   # In Production zwingend.
NEXTAUTH_SECRET="…"                       # min. 32 Byte Random.
NEXT_PUBLIC_APP_URL="https://fragenkreuzen.de"
```

## OAuth-Provider (optional)

### Google

1. https://console.cloud.google.com → OAuth Consent Screen konfigurieren.
2. **Credentials → Create OAuth Client ID → Web application**.
3. **Authorized redirect URIs**:
   - `https://fragenkreuzen.de/api/auth/callback/google`
   - lokal: `http://localhost:3000/api/auth/callback/google`
4. Env setzen:
   ```bash
   GOOGLE_CLIENT_ID="…"
   GOOGLE_CLIENT_SECRET="…"
   ```

### Apple

Apple Sign-In ist komplexer, weil das Client-Secret ein vorab signiertes
JWT (ES256) ist und nach max. 6 Monaten erneuert werden muss.

1. https://developer.apple.com → Identifiers → **Services ID** anlegen
   (Bundle/Identifier z. B. `de.fragenkreuzen.web`).
2. **Configure → Sign in with Apple** → Domains + Return URLs:
   - Domain: `fragenkreuzen.de`
   - Return URL: `https://fragenkreuzen.de/api/auth/callback/apple`
3. **Keys → + → Sign in with Apple** → Schlüssel-Datei (`.p8`) herunterladen
   und sichern. Notiere `KEY_ID` und `TEAM_ID`.
4. **Client Secret JWT erzeugen** (gültig bis zu 6 Monate; danach erneuern):

   ```bash
   # Beispiel mit `jose` (oder einem Skript deiner Wahl):
   #   header: { alg: "ES256", kid: KEY_ID }
   #   payload: {
   #     iss: TEAM_ID,
   #     iat: now,
   #     exp: now + 15777000,  // ~6 Monate
   #     aud: "https://appleid.apple.com",
   #     sub: SERVICES_ID
   #   }
   ```

   In der Praxis nutzt du dafür ein einmaliges Build-Skript und legst das
   resultierende JWT in die Env-Variable `APPLE_CLIENT_SECRET`.

5. Env:
   ```bash
   APPLE_CLIENT_ID="de.fragenkreuzen.web"
   APPLE_CLIENT_SECRET="<lang signiertes JWT>"
   ```

> Erneuere `APPLE_CLIENT_SECRET` rechtzeitig vor Ablauf (`exp`-Claim).

### Facebook (optional)

1. https://developers.facebook.com/apps → App anlegen → **Facebook Login**.
2. **Valid OAuth Redirect URIs**:
   `https://fragenkreuzen.de/api/auth/callback/facebook`
3. Env:
   ```bash
   FACEBOOK_CLIENT_ID="…"
   FACEBOOK_CLIENT_SECRET="…"
   ```

### Microsoft (optional)

1. https://entra.microsoft.com → **App registrations → New registration**.
2. **Redirect URI**:
   `https://fragenkreuzen.de/api/auth/callback/azure-ad`
3. **Certificates & secrets → Client secret** erstellen.
4. **Authentication → Supported account types**:
   - "Personal Microsoft accounts only" (Hotmail/Outlook)
   - oder "Accounts in any organizational directory and personal Microsoft accounts" (häufigste Wahl).
5. Env:
   ```bash
   AZURE_AD_CLIENT_ID="…"
   AZURE_AD_CLIENT_SECRET="…"
   AZURE_AD_TENANT_ID="common"   # oder Tenant-GUID
   ```

## Cloudflare Turnstile (optional)

1. https://dash.cloudflare.com/ → Account → **Turnstile** → Site anlegen.
2. Domains: `fragenkreuzen.de` (Production) bzw. `localhost` (Dev).
3. Env:
   ```bash
   NEXT_PUBLIC_TURNSTILE_SITE_KEY="…"
   TURNSTILE_SECRET_KEY="…"
   ```

Wenn beide Werte gesetzt sind, erscheint das Widget automatisch auf dem
**Registrierungs-Schritt**. Der Server prüft das Token gegen Cloudflare;
fehlt das Token oder ist es ungültig, antwortet der Register-Endpoint mit
`captcha_failed`.

## E-Mail-Code-Flow

Unverändert zur bisherigen Logik:

- Bei Registrierung: 6-stelliger Code, 15 Minuten gültig, einmal verwendbar.
- Code wird über `lib/mail.ts` (Zoho SMTP) versendet.
- Bestätigung über `/api/auth/verify` (rate-limited).
- "Code erneut senden" über `/api/auth/code/resend` (rate-limited, antwortet
  immer 200 → keine User-Enumeration).

## Redirects nach Login

- Default: `/generator`.
- `callbackUrl` wird aus dem URL-Param respektiert, wenn intern und sicher
  (`getSafeCallbackUrl`).
- OAuth-Login + Credentials nutzen denselben `callbackUrl`-Mechanismus.

## OAuth-Auto-Provisioning

Wenn ein User sich erstmals per OAuth einloggt:

1. `signIn`-Callback in `auth.ts` ruft `findOrCreateOAuthUser(email)`.
2. Existiert die E-Mail noch nicht: neuer User wird angelegt mit
   - `name = ""`, `surname = ""`
   - `passwordHash = "oauth_<random>"` (Login per Passwort dauerhaft
     blockiert für diesen User, bis er Passwort-Reset benutzt)
   - `emailVerifiedAt = now`
3. Existiert die E-Mail schon (etwa weil der User früher per Passwort
   registriert hat): der OAuth-Login wird mit dem bestehenden Account
   verknüpft. War `emailVerifiedAt` noch leer, wird es jetzt gesetzt
   (OAuth-Provider liefern bereits verifizierte E-Mails).

## Sicherheitshinweise

- Keine Secrets im Client.
- Keine E-Mail / kein Passwort / kein Code in Logs.
- Rate-Limits sind in-memory (best-effort in Multi-Instance/Serverless).
  Für harte Garantien Upstash Redis hinter `lib/auth-rate-limit.ts`.
- User-Enumeration über `check-email` ist abgemildert durch Rate-Limit;
  in besonders sensiblen Setups Captcha auch dort aktivieren (Code-Patch).
- OAuth-only-Accounts können sich **nicht** per Passwort einloggen. Der
  Credentials-Provider lehnt sie mit "null" ab.
