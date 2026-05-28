"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { GeneratorRunner } from "@/components/generator/generator-runner"
import { ProUpgradeCard } from "@/components/generator/pro-upgrade-card"
import type { BulkQuestion } from "@/lib/question-bulk-json"
import { cn } from "@/lib/utils"
import { GENERATOR_TOPIC_MAX } from "@/lib/generator-ai-config"
import { difficultyLabel } from "@/lib/generator-difficulty"
import { toast } from "sonner"

type QuotaState = {
  used: number
  remaining: number
  dailyLimit: number
  unlimited: boolean
}

type Props = {
  initialIsLoggedIn: boolean
  initialIsPro: boolean
  initialQuota: QuotaState
}

type SessionState = {
  questions: BulkQuestion[]
  meta: { topic: string; difficulty: number; mode: "single" | "case" }
}

type LimitState = {
  loginRequired: boolean
  upgradeRequired: boolean
  dailyLimit: number
  requested?: number
}

const TOPIC_SUGGESTIONS = [
  "Akutes Koronarsyndrom",
  "Akutes Nierenversagen",
  "Pneumonie",
  "Diabetisches Koma",
  "Anämie-Differenzialdiagnose",
  "Schilddrüsen-Notfälle",
] as const

const LOAD_STAGES = [
  "Frage wird vorbereitet…",
  "Antwortoptionen werden geprüft…",
  "Erklärungen werden verdichtet…",
  "Letzte Qualitätsprüfung…",
] as const

export function GeneratorPageClient({
  initialIsLoggedIn,
  initialIsPro,
  initialQuota,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const checkoutHandled = useRef(false)

  const [mode, setMode] = useState<"single" | "case">("single")
  const [caseCount, setCaseCount] = useState(3)
  const [difficulty, setDifficulty] = useState(3)
  const [topic, setTopic] = useState("")
  const [loading, setLoading] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [loadStage, setLoadStage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<SessionState | null>(null)
  const [limitState, setLimitState] = useState<LimitState | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn)
  const [isPro, setIsPro] = useState(initialIsPro)
  const [quota, setQuota] = useState<QuotaState>(initialQuota)
  const progressTimerRef = useRef<number | null>(null)
  const stageTimerRef = useRef<number | null>(null)

  const units = mode === "case" ? caseCount : 1

  const remainingSufficient = quota.unlimited || quota.remaining >= units

  const refreshQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/generate-questions/quota", { credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) return
      setQuota(data.quota)
      setIsLoggedIn(!!data.isLoggedIn)
      setIsPro(!!data.isPro)
    } catch {
      // ignore
    }
  }, [])

  // initial quota kommt vom Server (SSR) — kein zusätzlicher Roundtrip beim Mount.

  useEffect(() => {
    function onSubscriptionUpdated() {
      void refreshQuota()
    }
    window.addEventListener("fragenkreuzen:subscription-updated", onSubscriptionUpdated)
    return () => window.removeEventListener("fragenkreuzen:subscription-updated", onSubscriptionUpdated)
  }, [refreshQuota])

  useEffect(() => {
    const subscription = searchParams.get("subscription")
    const stripeSessionId = searchParams.get("session_id")
    if (subscription !== "success" || checkoutHandled.current) return
    checkoutHandled.current = true

    ;(async () => {
      if (stripeSessionId) {
        try {
          await fetch("/api/stripe/subscription/complete-checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ sessionId: stripeSessionId }),
          })
        } catch {
          // ignore
        }
      }
      window.dispatchEvent(new CustomEvent("fragenkreuzen:subscription-updated"))
      toast.success("Pro aktiviert – du kannst weiter generieren.")
      setLimitState(null)
      setIsPro(true)
      await refreshQuota()
      router.replace("/generator", { scroll: false })
    })()
  }, [searchParams, router, refreshQuota])

  useEffect(() => {
    if (!loading) {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
      if (stageTimerRef.current) {
        window.clearInterval(stageTimerRef.current)
        stageTimerRef.current = null
      }
      setLoadStage(0)
      return
    }

    setLoadProgress(6)
    setLoadStage(0)
    progressTimerRef.current = window.setInterval(() => {
      setLoadProgress((prev) => {
        if (prev >= 92) return prev
        if (prev < 40) return prev + 5
        if (prev < 75) return prev + 2
        return prev + 0.6
      })
    }, 350)

    stageTimerRef.current = window.setInterval(() => {
      setLoadStage((s) => (s < 3 ? s + 1 : s))
    }, 1800)

    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
      if (stageTimerRef.current) {
        window.clearInterval(stageTimerRef.current)
        stageTimerRef.current = null
      }
    }
  }, [loading])

  async function handleUpgrade() {
    if (!isLoggedIn) {
      router.push("/login?callbackUrl=/generator")
      return
    }
    setUpgrading(true)
    try {
      const res = await fetch("/api/stripe/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ returnTo: "/generator" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        toast.error(data.error === "already_pro" ? "Du bist bereits Pro." : "Checkout konnte nicht gestartet werden.")
        return
      }
      window.location.href = data.url
    } catch {
      toast.error("Netzwerkfehler beim Checkout.")
    } finally {
      setUpgrading(false)
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!quota.unlimited && quota.remaining < units) {
      setLimitState({
        loginRequired: !isLoggedIn,
        upgradeRequired: !isPro,
        dailyLimit: quota.dailyLimit,
        requested: units,
      })
      return
    }

    const trimmed = topic.trim()
    if (!trimmed) {
      setError("Bitte ein Thema eingeben.")
      return
    }
    if (trimmed.length < 3) {
      setError("Bitte ein Thema mit mindestens 3 Zeichen eingeben.")
      return
    }

    setLoading(true)
    setError(null)
    setLimitState(null)
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          topic: trimmed,
          difficulty,
          mode,
          caseQuestionCount: mode === "case" ? caseCount : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.status === 429 && data.limitReached) {
        setLimitState({
          loginRequired: !!data.loginRequired,
          upgradeRequired: !!data.upgradeRequired,
          dailyLimit: data.dailyLimit ?? quota.dailyLimit,
          requested: typeof data.requested === "number" ? data.requested : units,
        })
        if (data.dailyLimit != null) {
          setQuota((q) => ({
            ...q,
            used: data.used ?? q.dailyLimit,
            remaining: typeof data.remaining === "number" ? data.remaining : 0,
            dailyLimit: data.dailyLimit,
          }))
        }
        return
      }

      // Burst-Rate-Limit (kein Quota-Verbrauch)
      if (res.status === 429 && data.error === "rate_limited") {
        setError(
          typeof data.message === "string"
            ? data.message
            : "Bitte einen Moment warten und erneut versuchen."
        )
        return
      }

      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : typeof data.error === "string"
              ? humanizeError(data.error)
              : "Generierung fehlgeschlagen."
        )
        return
      }
      if (!data.ok || !Array.isArray(data.questions)) {
        setError("Unerwartete Server-Antwort.")
        return
      }

      if (data.quota) setQuota(data.quota)
      setLoadProgress(100)
      setSession({
        questions: data.questions,
        meta: {
          topic: data.meta?.topic ?? trimmed,
          difficulty: data.meta?.difficulty ?? difficulty,
          mode: data.meta?.mode === "case" ? "case" : "single",
        },
      })
    } catch {
      setError("Netzwerkfehler. Bitte später erneut versuchen.")
    } finally {
      setLoading(false)
      setLoadProgress(0)
    }
  }

  if (session) {
    return (
      <GeneratorRunner
        questions={session.questions}
        meta={session.meta}
        isPro={isPro}
        quotaRemaining={quota.unlimited ? null : quota.remaining}
        onUpgrade={handleUpgrade}
        upgrading={upgrading}
        onNewGeneration={() => {
          setSession(null)
          void refreshQuota()
        }}
      />
    )
  }

  const atLimit = !quota.unlimited && quota.remaining <= 0
  const effectiveLimitState = limitState

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="space-y-2 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Fragen-Generator
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Medizinische Prüfungsfragen in Sekunden
        </h1>
        <p className="text-sm text-muted-foreground">
          Single-Choice-Fragen und Fallvignetten mit ausführlichen Erklärungen – direkt kreuzbar.
        </p>
      </div>

      <QuotaBadge quota={quota} isPro={isPro} units={units} />

      {effectiveLimitState && (
        <GeneratorLimitPanel
          limitState={effectiveLimitState}
          upgrading={upgrading}
          onUpgrade={handleUpgrade}
        />
      )}

      <form onSubmit={handleGenerate} className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <Label>Fragetyp</Label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["single", "Einzelfrage"],
                ["case", "Fallfrage"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  mode === value
                    ? "border-primary bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode === "case" && (
          <div className="space-y-2">
            <Label>Anzahl Fragen zum Fall</Label>
            <div className="flex flex-wrap gap-2">
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCaseCount(n)}
                  className={cn(
                    "h-10 w-10 rounded-lg border text-sm font-medium transition-colors",
                    caseCount === n
                      ? "border-primary bg-primary/10"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="difficulty">Schwierigkeitsgrad</Label>
            <span className="text-sm font-medium tabular-nums">
              {difficulty} / 5 · {difficultyLabel(difficulty)}
            </span>
          </div>
          <input
            id="difficulty"
            type="range"
            min={1}
            max={5}
            step={1}
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>1 · Basis</span>
            <span>3 · Examen</span>
            <span>5 · Differential</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="topic">Thema</Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {topic.length}/{GENERATOR_TOPIC_MAX}
            </span>
          </div>
          <Input
            id="topic"
            value={topic}
            maxLength={GENERATOR_TOPIC_MAX}
            placeholder="z. B. Akutes Koronarsyndrom"
            onChange={(e) => setTopic(e.target.value.slice(0, GENERATOR_TOPIC_MAX))}
            disabled={loading}
          />
          {!topic && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {TOPIC_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTopic(s)}
                  className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Thema wird als Sachthema verwendet, nicht als Anweisung.
          </p>
        </div>

        {!quota.unlimited && (
          <p className="text-xs text-muted-foreground">
            {mode === "case"
              ? `Diese Fallfrage verwendet ${units} deiner heutigen Generierungen.`
              : "Diese Einzelfrage verwendet 1 deiner heutigen Generierungen."}
            {" "}Verbleibend: <span className="font-medium tabular-nums">{quota.remaining}</span>.
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600" role="alert" aria-live="polite">
            {error}
          </p>
        )}

        {loading && (
          <div className="space-y-2 rounded-lg border bg-muted/30 px-4 py-3" aria-live="polite">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{LOAD_STAGES[loadStage]}</span>
              <span className="tabular-nums text-muted-foreground">{Math.round(loadProgress)}%</span>
            </div>
            <Progress value={loadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {mode === "case"
                ? `Fall mit ${units} Teilfragen wird vorbereitet…`
                : "Frage, Antwortoptionen und Erklärungen werden verdichtet…"}
            </p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading || atLimit || !remainingSufficient}
        >
          {loading
            ? "Generiere…"
            : atLimit
              ? "Tageslimit erreicht"
              : !remainingSufficient
                ? `Reicht nicht für ${units} Fragen`
                : mode === "case"
                  ? `${units} Fallfragen generieren`
                  : "1 Frage generieren"}
        </Button>
      </form>

      {!isPro && (
        <ProUpgradeCard
          variant="generator"
          onUpgrade={handleUpgrade}
          upgrading={upgrading}
          isLoggedIn={isLoggedIn}
        />
      )}
    </div>
  )
}

function humanizeError(code: string): string {
  if (code === "daily_limit_reached") return "Tageslimit erreicht."
  if (code === "forbidden") return "Zugriff verweigert."
  if (code === "method_not_allowed") return "Ungültige Anfrage."
  return code
}

function QuotaBadge({
  quota,
  isPro,
  units,
}: {
  quota: QuotaState
  isPro: boolean
  units: number
}) {
  if (quota.unlimited) {
    return (
      <div className="rounded-xl border bg-emerald-500/5 px-4 py-3 text-center text-sm">
        <span className="font-medium text-emerald-700 dark:text-emerald-300">Unbegrenzt</span>
        <span className="text-muted-foreground"> · Generierungen heute</span>
      </div>
    )
  }

  const label = isPro ? "Pro" : "Kostenlos"
  const willNotFit = quota.remaining < units
  const tone = willNotFit
    ? "border-amber-500/40 bg-amber-500/10"
    : quota.remaining === 0
      ? "border-red-500/40 bg-red-500/10"
      : "border-border bg-muted/30"

  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm", tone)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <div className="mt-0.5 text-base font-semibold tabular-nums">
            {quota.remaining} <span className="text-sm font-normal text-muted-foreground">/ {quota.dailyLimit} heute übrig</span>
          </div>
        </div>
        <Progress
          value={quota.dailyLimit > 0 ? (quota.used / quota.dailyLimit) * 100 : 0}
          className="h-1.5 w-24"
        />
      </div>
    </div>
  )
}

function GeneratorLimitPanel({
  limitState,
  upgrading,
  onUpgrade,
}: {
  limitState: LimitState
  upgrading: boolean
  onUpgrade: () => void
}) {
  const { loginRequired, upgradeRequired, dailyLimit, requested } = limitState

  const reqText = requested && requested > 1
    ? `Deine Auswahl benötigt ${requested} Generierungen.`
    : ""

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-5 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold">Restkontingent reicht nicht</p>
        <p className="text-sm text-muted-foreground">
          {loginRequired
            ? `Heute sind ${dailyLimit} kostenlose Generierungen verfügbar. Melde dich an und upgrade auf Pro für mehr.`
            : upgradeRequired
              ? `Mit Pro stehen dir 100 Generierungen pro Tag zur Verfügung – ideal für ganze Fall-Sessions.`
              : `Heute sind alle ${dailyLimit} Generierungen verbraucht. Ab Mitternacht (MEZ) geht es weiter.`}
          {reqText && <> {reqText}</>}
        </p>
      </div>

      {upgradeRequired && (
        <ul className="grid gap-1.5 text-sm">
          {[
            "100 statt 3 Generierungen pro Tag",
            "Lange Fallvignetten ohne Limit-Druck",
            "Schwierigkeit 4 & 5 als Daily-Driver nutzbar",
          ].map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="mt-1 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">{b}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        {loginRequired && (
          <>
            <Button asChild variant="default" className="sm:flex-1">
              <Link href="/login?callbackUrl=/generator">Anmelden</Link>
            </Button>
            <Button asChild variant="outline" className="sm:flex-1">
              <Link href="/register?callbackUrl=/generator">Registrieren</Link>
            </Button>
          </>
        )}
        {upgradeRequired && (
          <Button onClick={onUpgrade} disabled={upgrading} className="sm:flex-1">
            {upgrading ? "Weiterleitung…" : loginRequired ? "Pro freischalten" : "Jetzt auf Pro upgraden"}
          </Button>
        )}
      </div>

      {loginRequired && upgradeRequired && (
        <p className="text-xs text-muted-foreground">
          Nach der Anmeldung kannst du direkt Pro abschließen und weiter generieren.
        </p>
      )}
    </div>
  )
}
