"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, CalendarClock, Repeat, Target, WifiOff, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { QuestionCard } from "@/components/kreuzen/question-card"
import { useQuestionBuffer } from "@/components/kreuzen/use-question-buffer"
import { StreakBadge } from "@/components/streak/streak-badge"
import { InstallHint } from "@/components/pwa/install-hint"
import { PlanChooser, type PlanChoice } from "@/components/subscription/plan-chooser"
import type { KreuzenItem, KreuzenSource } from "@/lib/kreuzen-types"
import { LEARN_PLANS, LEARN_PLAN_IDS, type LearnPlanId } from "@/lib/learn-plans"
import { dayForDate, daysBetween, loadProgress, saveProgress, todayIso } from "@/lib/learn-plan-progress"
import { trackClient } from "@/lib/track-client"

export type KreuzenStats = {
  /** Heute beantwortet (Server, nur angemeldet). */
  heute: number
  /** Beantwortet in den letzten 7 Tagen. */
  woche: number
  /** Trefferquote der letzten 7 Tage in %, null ohne Antworten. */
  quote7: number | null
  dueCount: number
  schwache: { topic: string; quote: number }[]
  dailyGoal: number
}

const STUFEN = [
  { v: 1, label: "Basis" },
  { v: 2, label: "Solide" },
  { v: 3, label: "Examen" },
  { v: 4, label: "Schwer" },
  { v: 5, label: "Fies" },
] as const

const STUFE_KEY = "fragenkreuzen:kreuzen:stufe"
const THEMEN_KEY = "fragenkreuzen:kreuzen:themen"
const HEUTE_KEY = "fragenkreuzen:kreuzen:heute"

function lesen<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function schreiben(key: string, v: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(v))
  } catch {
    // egal
  }
}

/** Aktiver Lernplan = der mit gesetztem Prüfungsdatum (zuletzt bevorzugt M2). */
function aktiverPlan(): { planId: LearnPlanId; examDate: string } | null {
  for (const id of LEARN_PLAN_IDS) {
    const p = loadProgress(id)
    if (p.examDate) return { planId: id, examDate: p.examDate }
  }
  return null
}

function quelleLabel(s: KreuzenSource): string {
  if (s.type === "topic") return s.topic
  if (s.type === "plan") return `${LEARN_PLANS[s.planId].shortLabel} · Tag ${s.day}`
  if (s.type === "weak") return "Schwächen"
  return "Wiederholung"
}

export function KreuzenApp({
  isLoggedIn,
  isPro: initialPro,
  stats,
  eingeladen = false,
  plaene = [],
}: {
  isLoggedIn: boolean
  isPro: boolean
  stats: KreuzenStats
  /** Über einen Einladungslink gekommen, noch nicht angemeldet. */
  eingeladen?: boolean
  /** Buchbare Tarife (nur angemeldet ohne Pro). */
  plaene?: PlanChoice[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPro, setIsPro] = useState(initialPro)
  const [source, setSource] = useState<KreuzenSource | null>(null)
  const [stufe, setStufe] = useState(3)
  const [themen, setThemen] = useState<string[]>([])
  const [eingabe, setEingabe] = useState("")
  const [plan, setPlan] = useState<{ planId: LearnPlanId; examDate: string } | null>(null)
  const [heuteLokal, setHeuteLokal] = useState(0)
  const [sitzung, setSitzung] = useState({ n: 0, richtig: 0 })
  const [upgrading, setUpgrading] = useState(false)

  const buffer = useQuestionBuffer({ source, difficulty: stufe, loggedIn: isLoggedIn })

  // Gerätezustand laden
  useEffect(() => {
    const s = lesen<number>(STUFE_KEY, 3)
    setStufe(s >= 1 && s <= 5 ? s : 3)
    setThemen(lesen<string[]>(THEMEN_KEY, []))
    setPlan(aktiverPlan())
    const h = lesen<{ tag: string; n: number }>(HEUTE_KEY, { tag: "", n: 0 })
    setHeuteLokal(h.tag === todayIso() ? h.n : 0)
    try {
      if (!sessionStorage.getItem("fk:session")) {
        sessionStorage.setItem("fk:session", "1")
        trackClient("session_start", { via: "kreuzen" })
      }
    } catch {
      // egal
    }
  }, [])

  // Deep-Link: /kreuzen?thema=… (Done-Karte des Generators, geteilte Links)
  useEffect(() => {
    const thema = searchParams.get("thema")?.trim().slice(0, 120)
    if (thema && thema.length >= 3) {
      starten({ type: "topic", topic: thema })
      router.replace("/kreuzen", { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Rückkehr aus dem Stripe-Checkout
  useEffect(() => {
    if (searchParams.get("subscription") !== "success") return
    const sid = searchParams.get("session_id")
    ;(async () => {
      if (sid) {
        await fetch("/api/stripe/subscription/complete-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sessionId: sid }),
        }).catch(() => null)
      }
      window.dispatchEvent(new CustomEvent("fragenkreuzen:subscription-updated"))
      toast.success("Pro aktiviert — unbegrenzt kreuzen.")
      setIsPro(true)
      buffer.erneut()
      router.replace("/kreuzen", { scroll: false })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const heute = Math.max(stats.heute, heuteLokal)
  const ziel = stats.dailyGoal > 0 ? stats.dailyGoal : 30

  const planHeute = useMemo(() => {
    if (!plan) return null
    const tag = dayForDate(plan.planId, plan.examDate, todayIso())
    const rest = daysBetween(todayIso(), plan.examDate)
    if (tag === null || rest === null) return null
    return { ...plan, tag, rest }
  }, [plan])

  function starten(s: KreuzenSource) {
    setSitzung({ n: 0, richtig: 0 })
    setSource(s)
    if (s.type === "topic") {
      const bisher = lesen<string[]>(THEMEN_KEY, [])
      const neu = [s.topic, ...bisher.filter((t) => t.toLowerCase() !== s.topic.toLowerCase())].slice(0, 6)
      setThemen(neu)
      schreiben(THEMEN_KEY, neu)
    }
    window.scrollTo({ top: 0 })
  }

  function stufeSetzen(v: number) {
    setStufe(v)
    schreiben(STUFE_KEY, v)
  }

  const beantwortet = useCallback(
    (item: KreuzenItem, chosenText: string, ms: number, correct: boolean) => {
      buffer.antworten(item, chosenText, ms)
      setSitzung((s) => ({ n: s.n + 1, richtig: s.richtig + (correct ? 1 : 0) }))
      setHeuteLokal((n) => {
        const neu = Math.max(n, stats.heute) + 1
        schreiben(HEUTE_KEY, { tag: todayIso(), n: neu })
        if (neu === ziel) toast.success(`Tagesziel geschafft: ${ziel} Fragen!`, { description: "Alles ab jetzt ist Vorsprung." })
        return neu
      })
      // Plantag als bearbeitet vermerken (gleicher Fortschritt wie im Generator).
      if (source?.type === "plan") {
        const p = loadProgress(source.planId)
        if (!p.done.includes(source.day)) saveProgress(source.planId, { ...p, done: [...p.done, source.day] })
      }
    },
    [buffer, source, stats.heute, ziel]
  )

  async function upgrade() {
    trackClient("upgrade_clicked", { from: "kreuzen" })
    if (!isLoggedIn) {
      router.push("/login?callbackUrl=/kreuzen")
      return
    }
    setUpgrading(true)
    try {
      const res = await fetch("/api/stripe/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ returnTo: "/kreuzen" }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      toast.error(data.error === "already_pro" ? "Du bist bereits Pro." : "Checkout konnte nicht gestartet werden.")
    } catch {
      toast.error("Checkout konnte nicht gestartet werden.")
    } finally {
      setUpgrading(false)
    }
  }

  // ------------------------------------------------------------------
  // Strom
  // ------------------------------------------------------------------
  if (source) {
    const item = buffer.current
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pt-3">
        <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-20 -mx-4 lg:top-0 mb-3 flex items-center gap-2 border-b bg-background/90 px-4 py-2 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setSource(null)}
            className="tap-target -ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Zurück zur Übersicht"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{quelleLabel(source)}</div>
            <div className="text-xs tabular-nums text-muted-foreground">
              {sitzung.n > 0 ? `${sitzung.richtig}/${sitzung.n} richtig · ` : ""}
              {heute}/{ziel} heute
            </div>
          </div>
          {buffer.offline && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <WifiOff className="h-3.5 w-3.5" aria-hidden /> {buffer.vorrat + (item ? 1 : 0)} offline
            </span>
          )}
          {item?.kind === "due" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <Repeat className="h-3.5 w-3.5" aria-hidden /> Wiederholung
            </span>
          )}
        </div>

        <div className="mb-3 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, (heute / ziel) * 100)}%` }} />
        </div>

        {item ? (
          <QuestionCard
            key={item.key}
            item={item}
            onAnswered={(text, ms, correct) => beantwortet(item, text, ms, correct)}
            onNext={() => {
              buffer.weiter()
              window.scrollTo({ top: 0 })
            }}
            canNext={buffer.vorrat > 0}
          />
        ) : (
          <LeerZustand
            grenze={buffer.grenze}
            laedt={buffer.laedt}
            fehler={buffer.fehler}
            offline={buffer.offline}
            source={source}
            isLoggedIn={isLoggedIn}
            isPro={isPro}
            plaene={plaene}
            upgrading={upgrading}
            onUpgrade={upgrade}
            onRetry={buffer.erneut}
            onHome={() => setSource(null)}
          />
        )}
      </div>
    )
  }

  // ------------------------------------------------------------------
  // Heute
  // ------------------------------------------------------------------
  const anteil = Math.min(1, heute / ziel)
  const proTag = stats.woche / 7
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-16 pt-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Heute</h1>
          <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
            {heute >= ziel ? `Ziel geschafft · ${heute} Fragen` : `${heute} von ${ziel} Fragen`}
            {stats.quote7 !== null && ` · ${stats.quote7} % in 7 Tagen`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoggedIn && <StreakBadge />}
          <Ring anteil={anteil} />
        </div>
      </div>

      {eingeladen && (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm">
          <div className="font-semibold">Du wurdest eingeladen 🎁</div>
          <p className="mt-0.5 text-muted-foreground">
            Kostenlos registrieren und 20 Fragen kreuzen — dann bekommt ihr beide einen Monat Pro geschenkt.
          </p>
          <Link
            href="/register?callbackUrl=%2Fkreuzen"
            className="mt-2 inline-flex h-10 items-center rounded-full bg-primary px-4 font-semibold text-primary-foreground"
          >
            Jetzt registrieren
          </Link>
        </div>
      )}

      {/* Hauptaktion */}
      {planHeute ? (
        <button
          type="button"
          onClick={() => starten({ type: "plan", planId: planHeute.planId, day: planHeute.tag })}
          className="block w-full rounded-3xl bg-primary p-5 text-left text-primary-foreground shadow-sm active:scale-[0.99]"
        >
          <div className="text-xs font-medium opacity-80">
            {LEARN_PLANS[planHeute.planId].shortLabel} · Tag {planHeute.tag}
          </div>
          <div className="mt-1 text-xl font-semibold">Weiterkreuzen</div>
          <div className="mt-1 text-sm opacity-90">
            {planHeute.rest > 0 ? `Noch ${planHeute.rest} Tage bis zur Prüfung` : "Prüfungstag — viel Erfolg!"}
          </div>
        </button>
      ) : themen[0] ? (
        <button
          type="button"
          onClick={() => starten({ type: "topic", topic: themen[0] })}
          className="block w-full rounded-3xl bg-primary p-5 text-left text-primary-foreground shadow-sm active:scale-[0.99]"
        >
          <div className="text-xs font-medium opacity-80">Zuletzt</div>
          <div className="mt-1 text-xl font-semibold">{themen[0]}</div>
          <div className="mt-1 text-sm opacity-90">Weiterkreuzen →</div>
        </button>
      ) : null}

      <ThemaEingabe
        wert={eingabe}
        setWert={setEingabe}
        vorschlaege={[...themen, ...stats.schwache.map((s) => s.topic)].filter((t, i, a) => a.indexOf(t) === i).slice(0, 6)}
        onStart={(t) => starten({ type: "topic", topic: t })}
        autoFocus={!planHeute && !themen[0]}
      />

      <div className="grid grid-cols-2 gap-3">
        <Kachel
          icon={<Repeat className="h-4 w-4" aria-hidden />}
          titel="Wiederholen"
          text={!isLoggedIn ? "Mit Konto" : stats.dueCount > 0 ? `${stats.dueCount} fällig` : "Nichts fällig"}
          disabled={!isLoggedIn || stats.dueCount === 0}
          onClick={() => starten({ type: "due" })}
        />
        <Kachel
          icon={<Target className="h-4 w-4" aria-hidden />}
          titel="Schwächen"
          text={
            !isLoggedIn ? "Mit Konto" : stats.schwache[0] ? `${stats.schwache[0].topic} · ${stats.schwache[0].quote} %` : "Erst kreuzen"
          }
          disabled={!isLoggedIn || stats.schwache.length === 0}
          onClick={() => starten({ type: "weak" })}
        />
      </div>

      {/* Schwierigkeit */}
      <div className="rounded-2xl border bg-card p-3">
        <div className="mb-2 flex items-center justify-between px-1 text-xs font-medium text-muted-foreground">
          <span>Schwierigkeit</span>
          {stufe >= 4 && <span>mit Fallstricken</span>}
        </div>
        <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Schwierigkeit">
          {STUFEN.map((s) => (
            <button
              key={s.v}
              type="button"
              role="radio"
              aria-checked={stufe === s.v}
              onClick={() => stufeSetzen(s.v)}
              className={cn(
                "h-11 rounded-xl text-sm font-medium transition-colors",
                stufe === s.v ? "bg-foreground text-background" : "bg-muted/60 text-foreground hover:bg-muted"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <PruefungsKarte
        plan={planHeute}
        proTag={proTag}
        quote7={stats.quote7}
        onSetzen={(planId, examDate) => {
          const p = loadProgress(planId)
          saveProgress(planId, { ...p, examDate })
          // Nur ein Plan ist aktiv: Datum beim anderen entfernen.
          for (const id of LEARN_PLAN_IDS) {
            if (id !== planId) {
              const o = loadProgress(id)
              if (o.examDate) saveProgress(id, { ...o, examDate: null })
            }
          }
          setPlan(examDate ? { planId, examDate } : null)
        }}
      />

      {heute >= 5 && <InstallHint />}

      {isLoggedIn && (
        <Link
          href="/account#einladen"
          className="flex items-center justify-between rounded-2xl border bg-card p-4 text-sm hover:bg-muted/40"
        >
          <span>
            <span className="font-semibold">Freunde einladen</span>
            <span className="block text-muted-foreground">Ein Monat Pro für euch beide.</span>
          </span>
          <span aria-hidden>🎁</span>
        </Link>
      )}

      {!isLoggedIn && (
        <p className="px-1 text-center text-sm text-muted-foreground">
          <Link href="/login?callbackUrl=/kreuzen" className="font-medium text-primary underline-offset-4 hover:underline">
            Kostenlos anmelden
          </Link>{" "}
          — dann merkt sich fragenkreuzen, was du wiederholen musst.
        </p>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------
// Bausteine
// ----------------------------------------------------------------------

function Ring({ anteil }: { anteil: number }) {
  const r = 20
  const u = 2 * Math.PI * r
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden className="-rotate-90">
      <circle cx="26" cy="26" r={r} fill="none" strokeWidth="6" className="stroke-muted" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={u}
        strokeDashoffset={u * (1 - anteil)}
        className="stroke-primary transition-all duration-500"
      />
    </svg>
  )
}

function Kachel({
  icon,
  titel,
  text,
  disabled,
  onClick,
}: {
  icon: React.ReactNode
  titel: string
  text: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted/50 disabled:opacity-55 disabled:hover:bg-card"
    >
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        {icon} {titel}
      </div>
      <div className="mt-1 truncate text-sm text-muted-foreground">{text}</div>
    </button>
  )
}

function ThemaEingabe({
  wert,
  setWert,
  vorschlaege,
  onStart,
  autoFocus,
}: {
  wert: string
  setWert: (v: string) => void
  vorschlaege: string[]
  onStart: (t: string) => void
  autoFocus: boolean
}) {
  const ok = wert.trim().length >= 3
  return (
    <div className="rounded-2xl border bg-card p-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (ok) onStart(wert.trim())
        }}
        className="flex gap-2"
      >
        <input
          value={wert}
          onChange={(e) => setWert(e.target.value)}
          placeholder="Thema, z. B. Herzinsuffizienz"
          autoFocus={autoFocus}
          maxLength={120}
          enterKeyHint="go"
          className="h-11 min-w-0 flex-1 rounded-xl border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Thema"
        />
        <button
          type="submit"
          disabled={!ok}
          className="inline-flex h-11 items-center gap-1 rounded-xl bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-40"
        >
          <Zap className="h-4 w-4" aria-hidden /> Los
        </button>
      </form>
      {vorschlaege.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {vorschlaege.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onStart(t)}
              className="max-w-full truncate rounded-full bg-muted/70 px-3 py-1.5 text-sm hover:bg-muted"
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Prüfungscountdown mit ehrlicher Prognose: keine erfundene Bestehens-
 * wahrscheinlichkeit, sondern Hochrechnung des eigenen Tempos und die echte
 * Trefferquote.
 */
function PruefungsKarte({
  plan,
  proTag,
  quote7,
  onSetzen,
}: {
  plan: { planId: LearnPlanId; examDate: string; tag: number; rest: number } | null
  proTag: number
  quote7: number | null
  onSetzen: (planId: LearnPlanId, examDate: string | null) => void
}) {
  const [bearbeiten, setBearbeiten] = useState(false)
  const [planId, setPlanId] = useState<LearnPlanId>(plan?.planId ?? "m2")
  const [datum, setDatum] = useState(plan?.examDate ?? "")

  if (plan && !bearbeiten) {
    const hoch = Math.round(proTag * Math.max(0, plan.rest))
    return (
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <CalendarClock className="h-4 w-4" aria-hidden /> {LEARN_PLANS[plan.planId].shortLabel} in {Math.max(0, plan.rest)} Tagen
          </div>
          <button type="button" onClick={() => setBearbeiten(true)} className="text-xs text-muted-foreground hover:text-foreground">
            Ändern
          </button>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {proTag >= 1
            ? `Bei deinem Tempo (${Math.round(proTag)} pro Tag) kreuzt du bis dahin noch rund ${hoch.toLocaleString("de-DE")} Fragen.`
            : "Kreuze ein paar Tage, dann rechnen wir dein Tempo bis zur Prüfung hoch."}
          {quote7 !== null && ` Trefferquote zuletzt: ${quote7} %.`}
        </p>
      </div>
    )
  }

  if (!bearbeiten) {
    return (
      <button
        type="button"
        onClick={() => setBearbeiten(true)}
        className="flex w-full items-center gap-2 rounded-2xl border border-dashed p-4 text-left text-sm text-muted-foreground hover:bg-muted/40"
      >
        <CalendarClock className="h-4 w-4" aria-hidden /> Prüfungsdatum setzen — dann kommt jeden Tag das passende Thema.
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="grid grid-cols-2 gap-1">
        {LEARN_PLAN_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setPlanId(id)}
            className={cn(
              "h-10 rounded-xl text-sm font-medium",
              planId === id ? "bg-foreground text-background" : "bg-muted/60"
            )}
          >
            {LEARN_PLANS[id].shortLabel}
          </button>
        ))}
      </div>
      <input
        type="date"
        value={datum}
        min={todayIso()}
        onChange={(e) => setDatum(e.target.value)}
        className="h-11 w-full rounded-xl border bg-background px-3 text-base"
        aria-label="Prüfungsdatum"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!datum}
          onClick={() => {
            onSetzen(planId, datum)
            setBearbeiten(false)
          }}
          className="h-10 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Speichern
        </button>
        {plan && (
          <button
            type="button"
            onClick={() => {
              onSetzen(plan.planId, null)
              setBearbeiten(false)
            }}
            className="h-10 rounded-xl px-3 text-sm text-muted-foreground hover:bg-muted"
          >
            Entfernen
          </button>
        )}
        <button type="button" onClick={() => setBearbeiten(false)} className="h-10 rounded-xl px-3 text-sm hover:bg-muted">
          Abbrechen
        </button>
      </div>
    </div>
  )
}

function LeerZustand({
  grenze,
  laedt,
  fehler,
  offline,
  source,
  isLoggedIn,
  isPro,
  plaene,
  upgrading,
  onUpgrade,
  onRetry,
  onHome,
}: {
  grenze: ReturnType<typeof useQuestionBuffer>["grenze"]
  laedt: boolean
  fehler: string | null
  offline: boolean
  source: KreuzenSource
  isLoggedIn: boolean
  isPro: boolean
  plaene: PlanChoice[]
  upgrading: boolean
  onUpgrade: () => void
  onRetry: () => void
  onHome: () => void
}) {
  const box = "rounded-3xl border bg-card p-6 text-center"

  if (grenze === "pool_limit" || grenze === "gen_limit") {
    return (
      <div className={box}>
        <div className="text-lg font-semibold">Tageskontingent erreicht</div>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          {!isLoggedIn
            ? "Mit einem kostenlosen Konto kreuzt du mehr Fragen am Tag und bekommst deine Fehler automatisch zur Wiederholung."
            : "Mit Pro kreuzt du unbegrenzt — so viele Fragen, wie dein Kopf schafft."}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {!isLoggedIn ? (
            <Link
              href="/login?callbackUrl=/kreuzen"
              className="inline-flex h-12 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground"
            >
              Kostenlos anmelden
            </Link>
          ) : !isPro && plaene.length > 1 ? (
            <PlanChooser choices={plaene} isLoggedIn={isLoggedIn} returnTo="/kreuzen" className="text-left" />
          ) : !isPro ? (
            <button
              type="button"
              onClick={onUpgrade}
              disabled={upgrading}
              className="h-12 rounded-full bg-primary font-semibold text-primary-foreground disabled:opacity-60"
            >
              {upgrading ? "Wird geöffnet …" : "Pro freischalten"}
            </button>
          ) : null}
          {isLoggedIn && (
            <button type="button" onClick={onHome} className="h-11 rounded-full text-sm text-muted-foreground hover:bg-muted">
              Fällige Wiederholungen gehen weiter
            </button>
          )}
        </div>
      </div>
    )
  }

  if (grenze === "keine_themen") {
    return (
      <div className={box}>
        <div className="text-lg font-semibold">{source.type === "due" ? "Alles wiederholt" : "Hier gibt es gerade nichts"}</div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {source.type === "due"
            ? "Für heute ist nichts mehr fällig. Stark."
            : source.type === "weak"
              ? "Kreuze erst ein paar Themen — dann wissen wir, wo es hakt."
              : "Für diesen Tag gibt es keine passenden Themen."}
        </p>
        <button type="button" onClick={onHome} className="mt-4 h-11 rounded-full bg-foreground px-6 text-sm font-semibold text-background">
          Zur Übersicht
        </button>
      </div>
    )
  }

  if (grenze === "kapazitaet") {
    return (
      <div className={box}>
        <div className="text-lg font-semibold">Zu diesem Thema gerade keine neuen Fragen</div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Alles, was es dazu schon gibt, hast du gekreuzt. Neue Fragen kommen später — probier solange ein anderes Thema
          oder eine andere Stufe.
        </p>
        <button type="button" onClick={onHome} className="mt-4 h-11 rounded-full bg-foreground px-6 text-sm font-semibold text-background">
          Anderes Thema
        </button>
      </div>
    )
  }

  if (grenze === "generierung_fehlgeschlagen") {
    return (
      <div className={box}>
        <div className="text-lg font-semibold">Frage konnte nicht erstellt werden</div>
        <p className="mt-1.5 text-sm text-muted-foreground">Es wurde nichts von deinem Kontingent abgezogen.</p>
        <button type="button" onClick={onRetry} className="mt-4 h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">
          Erneut versuchen
        </button>
      </div>
    )
  }

  if (offline || (fehler && !laedt)) {
    return (
      <div className={box}>
        <WifiOff className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
        <div className="mt-2 text-lg font-semibold">Kein Netz</div>
        <p className="mt-1.5 text-sm text-muted-foreground">Sobald du wieder Empfang hast, geht es automatisch weiter.</p>
        {!offline && (
          <button type="button" onClick={onRetry} className="mt-4 h-11 rounded-full bg-foreground px-6 text-sm font-semibold text-background">
            Erneut versuchen
          </button>
        )}
      </div>
    )
  }

  // Lädt: Beim ersten Mal zu einem neuen Thema entsteht die Frage gerade.
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted/70" />
      ))}
      <p className="pt-1 text-center text-sm text-muted-foreground">
        Fragen werden vorbereitet … Bei einem neuen Thema dauert die erste einmalig etwas länger, danach geht es ohne Warten.
      </p>
    </div>
  )
}
