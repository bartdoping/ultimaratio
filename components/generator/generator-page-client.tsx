"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { GeneratorRunner } from "@/components/generator/generator-runner"
import type { BulkQuestion } from "@/lib/question-bulk-json"
import { cn } from "@/lib/utils"
import { GENERATOR_TOPIC_MAX } from "@/lib/generator-ai-config"
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
}

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
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<SessionState | null>(null)
  const [limitState, setLimitState] = useState<LimitState | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn)
  const [isPro, setIsPro] = useState(initialIsPro)
  const [quota, setQuota] = useState<QuotaState>(initialQuota)
  const progressTimerRef = useRef<number | null>(null)

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

  useEffect(() => {
    void refreshQuota()
  }, [refreshQuota])

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
      return
    }

    setLoadProgress(6)
    progressTimerRef.current = window.setInterval(() => {
      setLoadProgress((prev) => {
        if (prev >= 92) return prev
        if (prev < 40) return prev + 5
        if (prev < 75) return prev + 2
        return prev + 0.6
      })
    }, 350)

    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
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
    if (quota.remaining <= 0 && !quota.unlimited) {
      setLimitState({
        loginRequired: !isLoggedIn,
        upgradeRequired: !isPro,
        dailyLimit: quota.dailyLimit,
      })
      return
    }

    const trimmed = topic.trim()
    if (!trimmed) {
      setError("Bitte ein Thema eingeben.")
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
        })
        if (data.dailyLimit != null) {
          setQuota((q) => ({
            ...q,
            used: data.used ?? q.dailyLimit,
            remaining: 0,
            dailyLimit: data.dailyLimit,
          }))
        }
        return
      }

      if (!res.ok) {
        setError(typeof data.error === "string" ? humanizeError(data.error) : "Generierung fehlgeschlagen.")
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
        onNewGeneration={() => {
          setSession(null)
          void refreshQuota()
        }}
      />
    )
  }

  const atLimit = !quota.unlimited && quota.remaining <= 0
  const effectiveLimitState =
    limitState ??
    (atLimit
      ? {
          loginRequired: !isLoggedIn,
          upgradeRequired: !isPro,
          dailyLimit: quota.dailyLimit,
        }
      : null)

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Generator</h1>
        <p className="text-sm text-muted-foreground">
          KI-Prüfungsfragen generieren, direkt kreuzen – ohne Speicherung.
        </p>
      </div>

      <QuotaBadge quota={quota} isPro={isPro} />

      {effectiveLimitState && (
        <GeneratorLimitPanel
          limitState={effectiveLimitState}
          upgrading={upgrading}
          onUpgrade={handleUpgrade}
        />
      )}

      <form onSubmit={handleGenerate} className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
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
            <span className="text-sm font-medium tabular-nums">{difficulty} / 5</span>
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
            <span>1 · sehr leicht</span>
            <span>3 · Examensniveau</span>
            <span>5 · sehr schwer</span>
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
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading && (
          <div className="space-y-2 rounded-lg border bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Generiere Fragen…</span>
              <span className="tabular-nums text-muted-foreground">{Math.round(loadProgress)}%</span>
            </div>
            <Progress value={loadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">Frage und Erklärungen werden generiert…</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading || atLimit}>
          {loading ? "Generiere…" : atLimit ? "Tageslimit erreicht" : "Generieren"}
        </Button>

        {!isPro && !atLimit && (
          <p className="text-center text-xs text-muted-foreground">
            Mit{" "}
            <button type="button" onClick={handleUpgrade} className="underline hover:text-foreground">
              Pro
            </button>{" "}
            bis zu 100 Generierungen pro Tag.
          </p>
        )}
      </form>
    </div>
  )
}

function humanizeError(code: string): string {
  if (code === "daily_limit_reached") return "Tageslimit erreicht."
  return code
}

function QuotaBadge({ quota, isPro }: { quota: QuotaState; isPro: boolean }) {
  if (quota.unlimited) {
    return <p className="text-center text-sm text-muted-foreground">Unbegrenzte Generierungen</p>
  }

  const label = isPro ? "Pro" : "Kostenlos"
  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3 text-center text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium tabular-nums">
        {quota.remaining} von {quota.dailyLimit}
      </span>
      <span className="text-muted-foreground"> Generierungen heute übrig</span>
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
  const { loginRequired, upgradeRequired, dailyLimit } = limitState

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 space-y-4">
      <div className="space-y-1 text-center">
        <p className="font-medium">Tageslimit erreicht</p>
        <p className="text-sm text-muted-foreground">
          {loginRequired
            ? `Du hast heute ${dailyLimit} kostenlose Generierungen genutzt. Melde dich an und upgrade auf Pro für mehr.`
            : upgradeRequired
              ? `Du hast heute alle ${dailyLimit} kostenlosen Generierungen verbraucht. Mit Pro kannst du bis zu 100 Fragen pro Tag generieren.`
              : `Du hast heute alle ${dailyLimit} Generierungen verbraucht. Ab Mitternacht (MEZ) geht es weiter.`}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 justify-center">
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
        <p className="text-xs text-center text-muted-foreground">
          Nach der Anmeldung kannst du direkt Pro abschließen und weiter generieren.
        </p>
      )}
    </div>
  )
}
