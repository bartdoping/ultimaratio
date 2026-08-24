"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowUp, CalendarDays, Layers, Sparkles, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { GeneratorRunner } from "@/components/generator/generator-runner"
import { ProUpgradeCard } from "@/components/generator/pro-upgrade-card"
import { PresetBar, type PresetData } from "@/components/generator/presets/preset-bar"
import { AiDisclaimer } from "@/components/legal/ai-disclaimer"
import { LearnPlanPicker } from "@/components/generator/learn-plan-picker"
import {
  LEARN_PLANS,
  generatableTopics,
  getLearnPlanDay,
  pickRandomTopic,
  planLastDay,
  type LearnPlanId,
} from "@/lib/learn-plans"
import type { BulkQuestion } from "@/lib/question-bulk-json"
import { cn } from "@/lib/utils"
import { GENERATOR_TOPIC_MAX } from "@/lib/generator-ai-config"
import { difficultyLabel } from "@/lib/generator-difficulty"
import {
  detectGenerationPhase,
  estimateProgress,
  PHASE_LABEL,
  type GenerationPhase,
} from "@/lib/stream-preview"
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
  initialTrialEligible?: boolean
  initialTrialEndsAt?: string | null
}

type SessionState = {
  questions: BulkQuestion[]
  meta: {
    topic: string
    difficulty: number
    mode: "single" | "case"
    /** Herkunft, wenn die Frage aus einem Lernplan-Tag stammt. */
    sourceLabel?: string
  }
}

type LimitState = {
  loginRequired: boolean
  upgradeRequired: boolean
  dailyLimit: number
  requested?: number
}

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
  initialTrialEligible = false,
  initialTrialEndsAt = null,
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
  const [trialEligible, setTrialEligible] = useState(initialTrialEligible)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(initialTrialEndsAt)
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [phase, setPhase] = useState<GenerationPhase | null>(null)
  /**
   * Schwierigkeit je Teilfrage einer Fallfrage. Index 0 = Teilfrage 1.
   * Wird auf `caseCount` zugeschnitten; neue Teilfragen erben die
   * Gesamtschwierigkeit. `perQuestionDifficulty` schaltet den Modus frei.
   */
  const [perQuestionDifficulty, setPerQuestionDifficulty] = useState(false)
  const [caseDifficulties, setCaseDifficulties] = useState<number[]>([])
  /**
   * Themenquelle: freies Thema oder ein Tag aus dem M2-Lernplan. Im
   * Lernplan-Modus wird beim Generieren zufällig ein Thema des Tages gezogen.
   */
  const [source, setSource] = useState<"free" | "plan">("free")
  const [planId, setPlanId] = useState<LearnPlanId>("m2")
  const [planDay, setPlanDay] = useState(1)
  const progressTimerRef = useRef<number | null>(null)
  const stageTimerRef = useRef<number | null>(null)

  const units = mode === "case" ? caseCount : 1

  // Länge der Teilfragen-Schwierigkeiten an caseCount angleichen; fehlende
  // Einträge erben die aktuell eingestellte Gesamtschwierigkeit.
  useEffect(() => {
    setCaseDifficulties((prev) => {
      if (prev.length === caseCount) return prev
      return Array.from({ length: caseCount }, (_, i) => prev[i] ?? difficulty)
    })
  }, [caseCount, difficulty])

  /** Effektive Schwierigkeiten, die an die API gehen. */
  const effectiveDifficulties =
    mode === "case" && perQuestionDifficulty
      ? Array.from({ length: caseCount }, (_, i) => caseDifficulties[i] ?? difficulty)
      : undefined

  const remainingSufficient = quota.unlimited || quota.remaining >= units

  const refreshQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/generate-questions/quota", { credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) return
      setQuota(data.quota)
      setIsLoggedIn(!!data.isLoggedIn)
      setIsPro(!!data.isPro)
      setTrialEligible(!!data.trialEligible)
      setTrialEndsAt(data.trialEndsAt ?? null)
    } catch {
      // ignore
    }
  }, [])

  // Cooldown-Ticker: aktualisiert verbleibende Sekunden, bis das Burst-Limit abläuft.
  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownRemaining(0)
      return
    }
    function tick() {
      const remaining = Math.max(0, Math.ceil((cooldownUntil! - Date.now()) / 1000))
      setCooldownRemaining(remaining)
      if (remaining <= 0) {
        setCooldownUntil(null)
      }
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [cooldownUntil])

  // initial quota kommt vom Server (SSR) — kein zusätzlicher Roundtrip beim Mount.

  useEffect(() => {
    function onSubscriptionUpdated() {
      void refreshQuota()
    }
    window.addEventListener("fragenkreuzen:subscription-updated", onSubscriptionUpdated)
    return () => window.removeEventListener("fragenkreuzen:subscription-updated", onSubscriptionUpdated)
  }, [refreshQuota])

  // Preset über Share-Link laden (?preset=<slug>)
  useEffect(() => {
    const presetSlug = searchParams.get("preset")
    if (!presetSlug) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/presets/${encodeURIComponent(presetSlug)}`)
        if (!res.ok) return
        const data = await res.json().catch(() => ({}))
        if (cancelled || !data?.ok || !data.preset) return
        const p = data.preset as PresetData
        setTopic(p.topic ?? "")
        setDifficulty(p.difficulty ?? 3)
        setMode(p.mode === "case" ? "case" : "single")
        if (p.mode === "case" && p.caseQuestionCount) {
          setCaseCount(p.caseQuestionCount)
        }
        toast.success(`Preset geladen: ${p.title}`)
        // URL aufräumen, damit Reload nicht erneut lädt.
        router.replace("/generator", { scroll: false })
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, router])

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
        if (data.error === "already_pro") {
          toast.error("Du bist bereits Pro.")
        } else if (data.error === "stripe_misconfigured") {
          toast.error("Checkout konnte nicht gestartet werden.", {
            description:
              typeof data.details === "string"
                ? data.details
                : "Stripe ist nicht vollständig konfiguriert.",
          })
        } else {
          toast.error("Checkout konnte nicht gestartet werden.", {
            description:
              typeof data.details === "string"
                ? data.details
                : typeof data.error === "string"
                  ? data.error
                  : undefined,
          })
        }
        return
      }
      window.location.href = data.url
    } catch {
      toast.error("Netzwerkfehler beim Checkout.")
    } finally {
      setUpgrading(false)
    }
  }

  /**
   * Generierung mit optionalen Overrides. Wird sowohl vom Form-Submit als auch
   * von den Quick-Actions auf der Done-Card aufgerufen.
   *
   * Wenn overrides.fromQuickAction === true, kommt der Aufruf aus einer
   * laufenden Runner-Session — wir blenden für die Wartezeit den Generator
   * (mit Loading-State) wieder ein, indem wir zuerst die Session schließen.
   */
  type GenerateOverrides = {
    topic?: string
    difficulty?: number
    mode?: "single" | "case"
    caseQuestionCount?: number
    fromQuickAction?: boolean
  }

  async function handleGenerate(
    eventOrOverrides?: React.FormEvent | GenerateOverrides,
    overridesArg?: GenerateOverrides
  ) {
    let overrides: GenerateOverrides = {}
    if (eventOrOverrides && "preventDefault" in eventOrOverrides) {
      eventOrOverrides.preventDefault()
      overrides = overridesArg ?? {}
    } else if (eventOrOverrides) {
      overrides = eventOrOverrides
    }

    // Themenquelle auflösen. Im Lernplan-Modus wird bei JEDER Generierung neu
    // gewürfelt — auch bei "Gleiches Thema" auf der Done-Card, damit man einen
    // Tag durchmischen kann, ohne jedes Mal zurück ins Formular zu müssen.
    // Ein ausdrücklicher Topic-Override (Preset, Share-Link) hat Vorrang.
    const planTopic =
      source === "plan" && overrides.topic === undefined
        ? pickRandomTopic(planId, planDay)
        : null
    const effTopic = (overrides.topic ?? planTopic ?? topic).trim()
    const effDifficulty = overrides.difficulty ?? difficulty
    const effMode = overrides.mode ?? mode
    const effCaseCount =
      effMode === "case" ? (overrides.caseQuestionCount ?? caseCount) : null
    const effUnits = effMode === "case" ? (effCaseCount ?? 1) : 1

    if (!quota.unlimited && quota.remaining < effUnits) {
      // Quick-Action mit zu wenig Restbudget → zurück zum Form mit Limit-Panel.
      if (overrides.fromQuickAction) {
        setSession(null)
      }
      setLimitState({
        loginRequired: !isLoggedIn,
        upgradeRequired: !isPro,
        dailyLimit: quota.dailyLimit,
        requested: effUnits,
      })
      return
    }

    if (!effTopic) {
      setError("Bitte ein Thema eingeben.")
      if (overrides.fromQuickAction) setSession(null)
      return
    }
    if (effTopic.length < 3) {
      setError("Bitte ein Thema mit mindestens 3 Zeichen eingeben.")
      if (overrides.fromQuickAction) setSession(null)
      return
    }

    // Form-State auf neue Werte syncen, damit die Generator-UI nach Rückkehr
    // (z. B. "Neues Thema") konsistent bleibt.
    if (overrides.topic !== undefined) setTopic(overrides.topic)
    if (overrides.difficulty !== undefined) setDifficulty(overrides.difficulty)
    if (overrides.mode !== undefined) setMode(overrides.mode)
    if (overrides.mode === "case" && overrides.caseQuestionCount !== undefined) {
      setCaseCount(overrides.caseQuestionCount)
    }

    // Quick-Action: Session schließen, damit der Loading-State sichtbar wird.
    if (overrides.fromQuickAction) {
      setSession(null)
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" })
      })
    }

    setLoading(true)
    setError(null)
    setLimitState(null)
    setPhase(null)
    setLoadStage(0)

    const payload: GeneratePayload = {
      topic: effTopic,
      difficulty: effDifficulty,
      mode: effMode,
      caseQuestionCount: effMode === "case" ? (effCaseCount ?? undefined) : undefined,
      difficulties: effMode === "case" ? effectiveDifficulties : undefined,
    }

    const onFatal = (msg: string, counted: boolean) => {
      setError(msg)
      if (counted) {
        toast.error("Diese Generierung ist fehlgeschlagen.", {
          description:
            "Dein Tagesbudget wurde nicht belastet – versuch es einfach nochmal.",
        })
      }
      void refreshQuota()
    }

    try {
      // Streaming dient ausschließlich dem Fortschritts-Signal — es wird KEIN
      // Frageninhalt vorab angezeigt (siehe lib/stream-preview.ts). Fällt der
      // Verbindungsaufbau aus, greift der klassische Endpoint.
      let result = await runStreamingGeneration(payload, (p, pct) => {
        setPhase(p)
        if (pct > 0) setLoadProgress((prev) => Math.max(prev, pct))
      })
      if (result.kind === "unsupported") {
        result = await runClassicGeneration(payload)
      }

      switch (result.kind) {
        case "limit": {
          const data = result.data
          setLimitState({
            loginRequired: !!data.loginRequired,
            upgradeRequired: !!data.upgradeRequired,
            dailyLimit: (data.dailyLimit as number) ?? quota.dailyLimit,
            requested: typeof data.requested === "number" ? data.requested : effUnits,
          })
          if (data.dailyLimit != null) {
            setQuota((qs) => ({
              ...qs,
              used: (data.used as number) ?? qs.dailyLimit,
              remaining: typeof data.remaining === "number" ? data.remaining : 0,
              dailyLimit: data.dailyLimit as number,
            }))
          }
          break
        }
        case "rate_limited": {
          setCooldownUntil(Date.now() + result.retryAfterSec * 1000)
          setError(result.message)
          break
        }
        case "error": {
          onFatal(result.message, result.counted)
          break
        }
        case "success": {
          if (result.quota) setQuota(result.quota)
          setLoadProgress(100)
          if (result.streak && typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("fragenkreuzen:streak-updated", { detail: result.streak })
            )
          }
          setSession({
            questions: result.questions,
            meta: {
              topic: result.meta?.topic ?? effTopic,
              difficulty: result.meta?.difficulty ?? effDifficulty,
              mode: result.meta?.mode === "case" ? "case" : "single",
              sourceLabel: planTopic
                ? `Tag ${planDay} · ${getLearnPlanDay(planId, planDay)?.subject ?? LEARN_PLANS[planId].shortLabel}`
                : undefined,
            },
          })
          break
        }
        default:
          onFatal("Unerwartete Server-Antwort.", false)
      }
    } catch {
      onFatal("Netzwerkfehler. Bitte später erneut versuchen.", false)
    } finally {
      setLoading(false)
      setLoadProgress(0)
      setPhase(null)
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
        onQuickAction={(action) => {
          // Quick-Actions auf der Done-Card lösen — bis auf "Neues Thema" —
          // direkt eine neue Generierung aus, OHNE dass der User zurück zum
          // Form muss. "Neues Thema" springt zurück zum Form, weil dort eine
          // neue Eingabe nötig ist.
          if (action === "new_topic") {
            setTopic("")
            setSession(null)
            void refreshQuota()
            requestAnimationFrame(() => {
              window.scrollTo({ top: 0, behavior: "smooth" })
            })
            return
          }

          const overrides: GenerateOverrides = { fromQuickAction: true }
          if (action === "harder") {
            overrides.difficulty = Math.min(5, difficulty + 1)
          } else if (action === "easier") {
            overrides.difficulty = Math.max(1, difficulty - 1)
          } else if (action === "as_case") {
            overrides.mode = "case"
            // caseCount bleibt beim zuletzt gewählten Wert
          }
          // "same_again" benötigt keine Overrides — nutzt aktuelle Werte.

          // Quota lokal aktualisieren wir asynchron nach der Generierung;
          // handleGenerate schließt die Session selbst und zeigt den Loading-
          // State an.
          void handleGenerate(overrides)
        }}
      />
    )
  }

  const atLimit = !quota.unlimited && quota.remaining <= 0
  const effectiveLimitState = limitState

  const onCooldown = cooldownRemaining > 0
  // Im Lernplan-Modus liefert der gewählte Tag das Thema — das Freitextfeld
  // darf dann leer sein.
  const planHasTopics = source !== "plan" || generatableTopics(planId, planDay).length > 0
  const submitDisabled =
    loading || atLimit || !remainingSufficient || onCooldown || !planHasTopics
  const submitLabel = loading
    ? "Generiere…"
    : onCooldown
      ? `Bitte ${cooldownRemaining}s warten…`
      : atLimit
        ? "Tageslimit erreicht"
        : !remainingSufficient
          ? `Reicht nicht für ${units} Fragen`
          : source === "plan"
            ? mode === "case"
              ? `${units} Fallfragen aus Tag ${planDay}`
              : `Frage aus Tag ${planDay} generieren`
            : mode === "case"
              ? `${units} Fallfragen generieren`
              : "Frage generieren"

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6 sm:px-6 sm:pt-10 lg:pb-14 lg:pt-14">
      {/* Hero — auf Mobile straffer */}
      <div className="mb-6 space-y-2 text-center sm:mb-8 sm:space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border bg-card/60 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur sm:text-xs">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          KI-Fragengenerator
        </div>
        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
          Was möchtest du heute kreuzen?
        </h1>
        <p className="mx-auto max-w-lg text-sm text-muted-foreground">
          Thema eingeben, Schwierigkeit wählen, sofort kreuzbar.
        </p>
      </div>

      {effectiveLimitState && (
        <div className="mb-6">
          <GeneratorLimitPanel
            limitState={effectiveLimitState}
            upgrading={upgrading}
            onUpgrade={handleUpgrade}
          />
        </div>
      )}

      {/* Presets (nur für eingeloggte User) */}
      {isLoggedIn && (
        <PresetBar
          isLoggedIn={isLoggedIn}
          current={{
            topic,
            difficulty,
            mode,
            caseQuestionCount: mode === "case" ? caseCount : null,
          }}
          onApply={(p) => {
            setTopic(p.topic ?? "")
            setDifficulty(p.difficulty ?? 3)
            setMode(p.mode === "case" ? "case" : "single")
            if (p.mode === "case" && p.caseQuestionCount) {
              setCaseCount(p.caseQuestionCount)
            }
          }}
        />
      )}

      {/* Command Center */}
      <form
        onSubmit={handleGenerate}
        className="rounded-3xl border bg-card/70 shadow-xl backdrop-blur-sm"
      >
        {/* Themenquelle: freies Thema oder Lernplan-Tag */}
        <div className="px-4 pt-4 sm:px-6 sm:pt-5">
          <SegmentedControl
            value={source}
            onChange={(v) => setSource(v)}
            options={[
              { value: "free" as const, label: "Freies Thema", icon: Wand2 },
              { value: "plan" as const, label: "Lernplan", icon: CalendarDays },
            ]}
          />
        </div>

        {/* Eingabe */}
        <div className="p-4 sm:p-6">
          {source === "free" ? (
            <>
              <label htmlFor="topic" className="sr-only">
                Thema
              </label>
              <textarea
                id="topic"
                value={topic}
                maxLength={GENERATOR_TOPIC_MAX}
                placeholder="z. B. Akutes Koronarsyndrom – Risikostratifizierung…"
                onChange={(e) => setTopic(e.target.value.slice(0, GENERATOR_TOPIC_MAX))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    if (!submitDisabled) {
                      void handleGenerate(e as unknown as React.FormEvent)
                    }
                  }
                }}
                rows={2}
                disabled={loading}
                className="min-h-[80px] w-full resize-none bg-transparent text-base leading-snug placeholder:text-muted-foreground/70 focus:outline-none sm:min-h-[96px] sm:text-lg"
              />
            </>
          ) : (
            <LearnPlanPicker
              planId={planId}
              onPlanChange={(id) => {
                setPlanId(id)
                // Tag auf den gültigen Bereich des neuen Plans begrenzen.
                setPlanDay((d) => Math.min(d, planLastDay(id)))
              }}
              day={planDay}
              onDayChange={setPlanDay}
              disabled={loading}
            />
          )}
        </div>

        {/* Toolbar: Mobile gestapelt, Desktop in einer Reihe */}
        <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              value={mode}
              onChange={(v) => setMode(v)}
              options={[
                { value: "single", label: "Einzelfrage", icon: Wand2 },
                { value: "case", label: "Fallfrage", icon: Layers },
              ]}
            />
            {mode === "case" && (
              <div className="flex items-center gap-1 rounded-full border bg-background/80 p-0.5 text-xs">
                {[2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCaseCount(n)}
                    className={cn(
                      "h-7 w-7 rounded-full font-medium transition-colors",
                      caseCount === n
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
            {!(mode === "case" && perQuestionDifficulty) && (
              <DifficultyPill level={difficulty} onChange={setDifficulty} />
            )}
            {mode === "case" && (
              <button
                type="button"
                onClick={() => setPerQuestionDifficulty((v) => !v)}
                aria-pressed={perQuestionDifficulty}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                  perQuestionDifficulty
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "bg-background/80 text-muted-foreground hover:bg-muted"
                )}
                title="Für jede Teilfrage eine eigene Schwierigkeit festlegen"
              >
                <Layers className="h-3.5 w-3.5" />
                Stufe je Teilfrage
              </button>
            )}
          </div>

          {/* Generate-Button: Desktop in der Toolbar; Mobile sticky bottom */}
          <Button
            type="submit"
            size="lg"
            disabled={submitDisabled}
            className="hidden h-11 gap-2 rounded-full px-5 sm:inline-flex"
          >
            <span>{submitLabel}</span>
            {!loading && !atLimit && remainingSufficient && (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Schwierigkeit je Teilfrage (nur Fallfrage + aktivierter Modus) */}
        {mode === "case" && perQuestionDifficulty && !loading && (
          <div className="space-y-2 border-t bg-muted/10 px-4 py-3 sm:px-5">
            <p className="text-xs text-muted-foreground">
              Jede Teilfrage bekommt ihre eigene Stufe — z. B. leichter Einstieg,
              dann ansteigender Anspruch. Der Falltext bleibt für alle gleich.
            </p>
            <div className="space-y-1.5">
              {Array.from({ length: caseCount }, (_, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <span className="w-[9.5rem] shrink-0 text-xs font-medium text-foreground">
                    Teilfrage {i + 1}
                  </span>
                  <DifficultyPill
                    level={caseDifficulties[i] ?? difficulty}
                    onChange={(lvl) =>
                      setCaseDifficulties((prev) => {
                        const next = Array.from(
                          { length: caseCount },
                          (_, k) => prev[k] ?? difficulty
                        )
                        next[i] = lvl
                        return next
                      })
                    }
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {difficultyLabel(caseDifficulties[i] ?? difficulty)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Status / Microcopy */}
        <div className="border-t px-4 py-3 text-xs text-muted-foreground sm:px-5">
          {loading ? (
            <div className="space-y-3" aria-live="polite">
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
                  aria-hidden
                >
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {phase ? PHASE_LABEL[phase] : LOAD_STAGES[loadStage]}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums">
                      {Math.round(loadProgress)}%
                    </span>
                  </div>
                  <Progress value={loadProgress} className="mt-1.5 h-1" />
                </div>
              </div>

              {/*
                Bewusst KEINE Inhalts-Vorschau: Nach dem Stream können noch
                Qualitäts-Repairs laufen, die Texte verändern. Eine Vorschau
                würde daher von der fertigen Frage abweichen.
              */}
              <div className="flex flex-wrap gap-1.5">
                {LOAD_STAGES.map((stage, i) => (
                  <span
                    key={stage}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                      i < loadStage
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : i === loadStage
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border bg-muted/30 text-muted-foreground"
                    )}
                  >
                    {stage.replace("…", "")}
                  </span>
                ))}
              </div>
            </div>
          ) : error ? (
            <p className="text-red-500" role="alert" aria-live="polite">
              {error}
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {quota.unlimited
                  ? "Unbegrenzte Generierungen."
                  : mode === "case"
                    ? `Verbraucht ${units} von ${quota.remaining} verbleibenden heute.`
                    : `Verbraucht 1 von ${quota.remaining} verbleibenden heute.`}
              </span>
              <span className="hidden sm:inline">Enter sendet · Shift+Enter neue Zeile</span>
            </div>
          )}
        </div>

        {/* MOBILE STICKY GENERATE-CTA */}
        <div
          className="sticky bottom-0 z-10 border-t bg-card/95 px-4 py-3 backdrop-blur sm:hidden"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom),0.75rem)" }}
        >
          <Button
            type="submit"
            disabled={submitDisabled}
            className="h-12 w-full gap-2 rounded-full text-base"
          >
            <span>{submitLabel}</span>
            {!loading && !atLimit && remainingSufficient && (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>

      {/* Pro-Hint dezent unter dem Command Center */}
      {!isPro && !quota.unlimited && (
        <div className="mt-8">
          <ProUpgradeCard
            variant="generator"
            onUpgrade={handleUpgrade}
            upgrading={upgrading}
            isLoggedIn={isLoggedIn}
            isPro={isPro}
            trialEligible={trialEligible}
          />
        </div>
      )}

      {/* Transparenzhinweis für KI-Inhalte (Art. 50 KI-VO) */}
      <AiDisclaimer variant="card" className="mt-6" />

      {/* Aktiv laufendes Trial: Dezenter Hinweis am Ende */}
      {isPro && trialEndsAt && (
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <span className="font-medium">Pro-Testphase aktiv</span>{" "}
          <span className="text-muted-foreground">
            – läuft bis {new Date(trialEndsAt).toLocaleDateString("de-DE")}. Du kannst jederzeit ein Abo abschließen, damit es nahtlos weitergeht.
          </span>
        </div>
      )}
    </div>
  )
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{
    value: T
    label: string
    icon?: React.ComponentType<{ className?: string }>
  }>
}) {
  return (
    <div className="inline-flex items-center rounded-full border bg-background/80 p-0.5 text-xs">
      {options.map((opt) => {
        const Icon = opt.icon
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function DifficultyPill({
  level,
  onChange,
}: {
  level: number
  onChange: (level: number) => void
}) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-2 py-1 text-xs"
      title={`Schwierigkeit ${level}/5 · ${difficultyLabel(level)}`}
    >
      <span className="text-muted-foreground">Schwierigkeit</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`Schwierigkeit ${n} setzen`}
            className={cn(
              "h-5 w-5 rounded-full text-[10px] font-semibold transition-colors",
              n <= level
                ? "bg-primary text-primary-foreground"
                : "border bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function humanizeError(code: string): string {
  if (code === "daily_limit_reached") return "Tageslimit erreicht."
  if (code === "forbidden") return "Zugriff verweigert."
  if (code === "method_not_allowed") return "Ungültige Anfrage."
  return code
}


// ============================================================================
// Generierung: Streaming (nur Fortschritt) + klassischer Fallback.
// ============================================================================

type GeneratePayload = {
  topic: string
  difficulty: number
  mode: "single" | "case"
  caseQuestionCount?: number
  /** Optional: Schwierigkeit je Teilfrage einer Fallfrage. */
  difficulties?: number[]
}

type GenResult =
  | {
      kind: "success"
      questions: BulkQuestion[]
      meta?: { topic?: string; difficulty?: number; mode?: string }
      quota?: QuotaState
      streak?: unknown
    }
  | { kind: "limit"; data: Record<string, unknown> }
  | { kind: "rate_limited"; retryAfterSec: number; message: string }
  | { kind: "error"; message: string; counted: boolean }
  | { kind: "unsupported" }

function mapJsonToResult(
  status: number,
  ok: boolean,
  data: Record<string, unknown>
): GenResult {
  if (status === 429 && data.limitReached) {
    return { kind: "limit", data }
  }
  if (status === 429 && data.error === "rate_limited") {
    return {
      kind: "rate_limited",
      retryAfterSec: Math.max(1, Math.ceil(Number(data.retryAfterSec) || 10)),
      message:
        typeof data.message === "string"
          ? data.message
          : "Bitte einen Moment warten und erneut versuchen.",
    }
  }
  if (!ok) {
    const counted = status >= 500 || status === 502 || status === 504
    const message =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? humanizeError(data.error)
          : "Generierung fehlgeschlagen."
    return { kind: "error", message, counted }
  }
  if (!data.ok || !Array.isArray(data.questions)) {
    return { kind: "error", message: "Unerwartete Server-Antwort.", counted: false }
  }
  return {
    kind: "success",
    questions: data.questions as BulkQuestion[],
    meta: data.meta as { topic?: string; difficulty?: number; mode?: string } | undefined,
    quota: data.quota as QuotaState | undefined,
    streak: data.streak,
  }
}

async function runClassicGeneration(payload: GeneratePayload): Promise<GenResult> {
  let res: Response
  try {
    res = await fetch("/api/ai/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    })
  } catch {
    return { kind: "error", message: "Netzwerkfehler. Bitte später erneut versuchen.", counted: false }
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return mapJsonToResult(res.status, res.ok, data)
}

/**
 * Konsumiert den SSE-Stream. Der Callback liefert ausschließlich Phase und
 * Fortschritt in Prozent — bewusst KEINEN Frageninhalt, damit nichts angezeigt
 * wird, was ein nachgelagerter Repair noch verändern könnte.
 */
async function runStreamingGeneration(
  payload: GeneratePayload,
  onProgress: (phase: GenerationPhase, percent: number) => void
): Promise<GenResult> {
  let res: Response
  try {
    res = await fetch("/api/ai/generate-questions/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    })
  } catch {
    // Verbindungsaufbau fehlgeschlagen → klassischer Fallback.
    return { kind: "unsupported" }
  }

  const ct = res.headers.get("content-type") || ""
  if (!ct.includes("text/event-stream") || !res.body) {
    // Vorprüfungs-Fehler (Limit / Rate-Limit / Validierung) kommen als JSON.
    if (ct.includes("application/json")) {
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
      return mapJsonToResult(res.status, res.ok, data)
    }
    return { kind: "unsupported" }
  }

  // Erwartete Ausgabegröße als Referenz für den Fortschrittsbalken. Gemessen:
  // Einzelfrage ≈ 9.000 Zeichen, Fallfrage ≈ 8.300 Zeichen je Teilfrage.
  const expectedChars =
    payload.mode === "case" ? 8300 * (payload.caseQuestionCount ?? 3) : 9000

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ""
  let full = ""
  let lastTick = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const rawChunk = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        const dataLine = rawChunk.split("\n").find((l) => l.startsWith("data:"))
        if (!dataLine) continue
        const jsonStr = dataLine.slice(5).trim()
        if (!jsonStr) continue
        let evt: Record<string, unknown>
        try {
          evt = JSON.parse(jsonStr)
        } catch {
          continue
        }
        if (evt.type === "delta") {
          full += typeof evt.text === "string" ? evt.text : ""
          const now = Date.now()
          if (now - lastTick > 120) {
            lastTick = now
            onProgress(detectGenerationPhase(full), estimateProgress(full.length, expectedChars))
          }
        } else if (evt.type === "verifying") {
          onProgress("verifying", 96)
        } else if (evt.type === "final") {
          if (!Array.isArray(evt.questions)) {
            return { kind: "error", message: "Unerwartete Server-Antwort.", counted: false }
          }
          return {
            kind: "success",
            questions: evt.questions as BulkQuestion[],
            meta: evt.meta as { topic?: string; difficulty?: number; mode?: string } | undefined,
            quota: evt.quota as QuotaState | undefined,
            streak: evt.streak,
          }
        } else if (evt.type === "error") {
          return {
            kind: "error",
            message: typeof evt.error === "string" ? evt.error : "Generierung fehlgeschlagen.",
            counted: false,
          }
        }
        // type "start" wird ignoriert.
      }
    }
  } catch {
    return { kind: "error", message: "Verbindung zur Generierung unterbrochen.", counted: false }
  }

  // Stream endete ohne "final" → als Fehler behandeln.
  return { kind: "error", message: "Generierung unvollständig. Bitte erneut versuchen.", counted: false }
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
