"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { ArrowRight, Eye, EyeOff, Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { getSafeCallbackUrl } from "@/lib/auth-redirect"
import { TurnstileWidget } from "./turnstile-widget"
import {
  AppleIcon,
  FacebookIcon,
  GoogleIcon,
  MicrosoftIcon,
} from "./provider-icons"
import type { OAuthProviderInfo } from "@/lib/auth-providers"

type Step =
  | { kind: "email" }
  | { kind: "login"; email: string }
  | { kind: "register"; email: string }
  | { kind: "verify"; email: string }

type Props = {
  providers: OAuthProviderInfo[]
  turnstileSiteKey: string | null
}

function providerIcon(id: OAuthProviderInfo["id"]) {
  switch (id) {
    case "google":
      return <GoogleIcon />
    case "apple":
      return <AppleIcon className="h-5 w-5 text-foreground" />
    case "facebook":
      return <FacebookIcon />
    case "azure-ad":
      return <MicrosoftIcon />
  }
}

export function AuthClient({ providers, turnstileSiteKey }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = getSafeCallbackUrl(
    params.get("callbackUrl") || params.get("next"),
    "/generator"
  )
  const initialEmail = params.get("email") ?? ""

  const [step, setStep] = useState<Step>(
    initialEmail ? { kind: "email" } : { kind: "email" }
  )
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [code, setCode] = useState("")
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [oauthBusy, setOauthBusy] = useState<string | null>(null)
  const codeInputRef = useRef<HTMLInputElement | null>(null)
  const [resendCooldownUntil, setResendCooldownUntil] = useState<number>(0)
  const [nowTick, setNowTick] = useState<number>(() => Date.now())

  const captchaConfigured = !!turnstileSiteKey
  // Captcha nur beim Registrieren — der Email-Check ist nur rate-limited.
  const captchaSatisfiedForRegister = !captchaConfigured || !!captchaToken

  // Focus auf Code-Eingabe, sobald Verify-Step aktiv.
  useEffect(() => {
    if (step.kind === "verify") {
      // delay damit Mount fertig ist
      const t = setTimeout(() => codeInputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [step.kind])

  const handleCaptchaVerify = useCallback((token: string | null) => {
    setCaptchaToken(token)
  }, [])

  async function continueWithEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Bitte eine gültige E-Mail-Adresse eingeben.")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 429) {
        setError("Zu viele Versuche. Bitte kurz warten.")
        return
      }
      if (!res.ok || !data?.ok) {
        setError("Prüfung fehlgeschlagen. Bitte erneut versuchen.")
        return
      }

      // Captcha-Token ist single-use → frisch holen lassen
      setCaptchaToken(null)

      if (data.exists && data.hasPassword) {
        setStep({ kind: "login", email: trimmed })
      } else if (data.exists && !data.hasPassword) {
        setError(
          "Dieser Account wurde über einen Anbieter (z. B. Google/Apple) erstellt. Bitte denselben Anbieter verwenden."
        )
      } else {
        setStep({ kind: "register", email: trimmed })
      }
    } catch {
      setError("Netzwerkfehler. Bitte später erneut versuchen.")
    } finally {
      setBusy(false)
    }
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault()
    if (step.kind !== "login") return
    setError(null)
    setBusy(true)
    try {
      const res = await signIn("credentials", {
        email: step.email,
        password,
        redirect: false,
        callbackUrl,
      })
      if (res?.error) {
        setError("Anmeldung fehlgeschlagen. Passwort oder Bestätigung prüfen.")
        return
      }
      router.replace(callbackUrl)
    } finally {
      setBusy(false)
    }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault()
    if (step.kind !== "register") return
    setError(null)
    setInfo(null)
    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen lang sein.")
      return
    }
    if (captchaConfigured && !captchaToken) {
      setError("Bitte das Captcha bestätigen.")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: step.email,
          password,
          captchaToken,
        }),
      })
      const data = await res.json().catch(() => ({}))
      setCaptchaToken(null)
      if (res.status === 429) {
        setError("Zu viele Versuche. Bitte kurz warten.")
        return
      }
      if (res.status === 409 || data?.error === "email_taken") {
        setStep({ kind: "login", email: step.email })
        setInfo("Diese E-Mail existiert bereits — bitte einloggen.")
        return
      }
      if (!res.ok || !data?.ok) {
        setError("Registrierung fehlgeschlagen. Bitte später erneut versuchen.")
        return
      }
      setStep({ kind: "verify", email: step.email })
      setInfo("Bestätigungscode versendet. Bitte E-Mail prüfen.")
    } catch {
      setError("Netzwerkfehler. Bitte später erneut versuchen.")
    } finally {
      setBusy(false)
    }
  }

  async function submitVerify(e: React.FormEvent) {
    e.preventDefault()
    if (step.kind !== "verify") return
    setError(null)
    if (!/^\d{6}$/.test(code)) {
      setError("Der Code besteht aus 6 Ziffern.")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: step.email, code }),
      })
      if (res.status === 429) {
        setError("Zu viele Versuche. Bitte kurz warten.")
        return
      }
      if (!res.ok) {
        setError("Code ungültig oder abgelaufen.")
        return
      }
      // Direkt einloggen mit Passwort, das der User gerade gesetzt hat —
      // funktioniert, weil der Code-Verify den User verifiziert hat.
      const login = await signIn("credentials", {
        email: step.email,
        password,
        redirect: false,
        callbackUrl,
      })
      if (login?.error) {
        // Sicherheits-Fallback: zum klassischen Login.
        router.replace(`/login?email=${encodeURIComponent(step.email)}`)
        return
      }
      router.replace(callbackUrl)
    } finally {
      setBusy(false)
    }
  }

  async function handleResendCode() {
    if (step.kind !== "verify") return
    if (Date.now() < resendCooldownUntil) return
    setError(null)
    setBusy(true)
    try {
      await fetch("/api/auth/code/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: step.email }),
      })
      setInfo("Neuer Code wurde gesendet.")
      setResendCooldownUntil(Date.now() + 30_000)
    } catch {
      setError("Code-Versand fehlgeschlagen.")
    } finally {
      setBusy(false)
    }
  }

  // Tickt jede Sekunde nur, wenn ein aktiver Cooldown läuft.
  useEffect(() => {
    if (resendCooldownUntil <= Date.now()) return
    const handle = window.setInterval(() => {
      const now = Date.now()
      setNowTick(now)
      if (now >= resendCooldownUntil) {
        window.clearInterval(handle)
      }
    }, 1000)
    return () => window.clearInterval(handle)
  }, [resendCooldownUntil])

  const remainingResendSec = Math.max(
    0,
    Math.ceil((resendCooldownUntil - nowTick) / 1000)
  )

  function handleOAuth(providerId: string) {
    setOauthBusy(providerId)
    void signIn(providerId, { callbackUrl })
  }

  const subline = "Generiere und kreuze medizinische Prüfungsfragen mit KI."
  const titleByStep =
    step.kind === "verify"
      ? "E-Mail bestätigen"
      : step.kind === "login"
        ? "Willkommen zurück"
        : step.kind === "register"
          ? "Account erstellen"
          : "Anmelden oder Registrieren"

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] flex items-center justify-center px-4 py-10">
      {/* Hintergrund-Glow + dezenter Grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,theme(colors.primary/15),transparent_60%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,theme(colors.border/.6)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.border/.6)_1px,transparent_1px)] [background-size:48px_48px] opacity-30" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-6 text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{titleByStep}</h1>
          <p className="text-sm text-muted-foreground">{subline}</p>
        </div>

        <div className="rounded-2xl border bg-card/70 p-6 shadow-lg backdrop-blur-sm sm:p-7 space-y-5">
          {/* OAuth-Buttons NUR im email-Step. Im Verify/Login/Register wirkten sie verwirrend. */}
          {step.kind === "email" && providers.length > 0 && (
            <>
              <div className="space-y-2.5">
                {providers.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    variant="outline"
                    className="h-11 w-full justify-center gap-2 text-sm"
                    onClick={() => handleOAuth(p.id)}
                    disabled={!!oauthBusy}
                  >
                    {oauthBusy === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      providerIcon(p.id)
                    )}
                    <span>{p.label}</span>
                  </Button>
                ))}
              </div>
              <Separator label="oder" />
            </>
          )}

          {step.kind === "email" && (
            <form onSubmit={continueWithEmail} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">
                  E-Mail-Adresse
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="du@beispiel.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 pl-9"
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500" role="alert" aria-live="polite">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="h-11 w-full"
                disabled={busy || !email.trim()}
              >
                {busy ? "Bitte warten…" : "Fortsetzen"}
                {!busy && <ArrowRight className="ml-1 h-4 w-4" />}
              </Button>
            </form>
          )}

          {step.kind === "login" && (
            <form onSubmit={submitLogin} className="space-y-4" noValidate>
              <EmailReadout email={step.email} onEdit={() => setStep({ kind: "email" })} />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm">Passwort</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                  >
                    Passwort vergessen?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={setPassword}
                  show={showPw}
                  onToggleShow={() => setShowPw((v) => !v)}
                  autoComplete="current-password"
                />
              </div>

              {info && <p className="text-sm text-emerald-500" aria-live="polite">{info}</p>}
              {error && <p className="text-sm text-red-500" role="alert" aria-live="polite">{error}</p>}

              <Button type="submit" className="h-11 w-full" disabled={busy || !password}>
                {busy ? "Anmelden…" : "Einloggen"}
              </Button>
            </form>
          )}

          {step.kind === "register" && (
            <form onSubmit={submitRegister} className="space-y-4" noValidate>
              <EmailReadout email={step.email} onEdit={() => setStep({ kind: "email" })} />
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">Passwort festlegen</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={setPassword}
                  show={showPw}
                  onToggleShow={() => setShowPw((v) => !v)}
                  autoComplete="new-password"
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">Mindestens 8 Zeichen.</p>
              </div>

              {turnstileSiteKey && (
                <TurnstileWidget
                  siteKey={turnstileSiteKey}
                  onVerify={handleCaptchaVerify}
                />
              )}

              {info && <p className="text-sm text-emerald-500" aria-live="polite">{info}</p>}
              {error && <p className="text-sm text-red-500" role="alert" aria-live="polite">{error}</p>}

              <Button
                type="submit"
                className="h-11 w-full"
                disabled={busy || password.length < 8 || !captchaSatisfiedForRegister}
              >
                {busy ? "Erstelle Account…" : "Account erstellen"}
              </Button>

              <p className="text-xs text-muted-foreground">
                Mit dem Erstellen akzeptierst du unsere{" "}
                <Link href="/agb" className="underline">AGB</Link> und{" "}
                <Link href="/datenschutz" className="underline">Datenschutz</Link>.
              </p>
            </form>
          )}

          {step.kind === "verify" && (
            <form onSubmit={submitVerify} className="space-y-4" noValidate>
              <EmailReadout email={step.email} onEdit={() => setStep({ kind: "email" })} />
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm">Code (6 Ziffern)</Label>
                <Input
                  id="code"
                  ref={codeInputRef}
                  inputMode="numeric"
                  pattern="\d*"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="h-12 text-center text-xl tracking-[0.5em]"
                  required
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Wir haben dir einen Code per E-Mail geschickt.</span>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={busy || remainingResendSec > 0}
                    className={cn(
                      "underline-offset-4 transition-colors",
                      busy || remainingResendSec > 0
                        ? "cursor-not-allowed opacity-50"
                        : "hover:text-foreground hover:underline"
                    )}
                  >
                    {remainingResendSec > 0
                      ? `Neuer Code in ${remainingResendSec}s`
                      : "Code erneut senden"}
                  </button>
                </div>
              </div>

              {info && <p className="text-sm text-emerald-500" aria-live="polite">{info}</p>}
              {error && <p className="text-sm text-red-500" role="alert" aria-live="polite">{error}</p>}

              <Button
                type="submit"
                className="h-11 w-full"
                disabled={busy || code.length !== 6}
              >
                {busy ? "Bestätige…" : "Bestätigen & einloggen"}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Geschützt durch Cookies und Rate-Limits.{" "}
          <Link href="/impressum" className="underline-offset-4 hover:underline">Impressum</Link>
          {" · "}
          <Link href="/datenschutz" className="underline-offset-4 hover:underline">Datenschutz</Link>
        </p>
      </div>
    </div>
  )
}

function Separator({ label }: { label: string }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wide">
        <span className="bg-card px-2 text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

function EmailReadout({ email, onEdit }: { email: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
      <span className="truncate font-medium">{email}</span>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Ändern
      </button>
    </div>
  )
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
  minLength,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggleShow: () => void
  autoComplete?: string
  minLength?: number
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 pr-11"
        required
      />
      <button
        type="button"
        onClick={onToggleShow}
        aria-label={show ? "Passwort verbergen" : "Passwort anzeigen"}
        className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
