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
import { ErinnerungsAngebot, FlowHinweis, RundenKarte, type ThemenStand } from "@/components/kreuzen/stream-extras"
import { rundeFaellig, rundenBilanz, serie, serienMeilenstein, stufenVorschlag } from "@/lib/kreuzen-flow"
import type { Reife } from "@/lib/pruefungsreife"
import { Einstieg, type EinstiegErgebnis } from "@/components/kreuzen/einstieg"
import { PruefungsreifeKarte } from "@/components/kreuzen/pruefungsreife-karte"
import { ProbeKlausur } from "@/components/kreuzen/probe-klausur"
import { TrialStartButton } from "@/components/subscription/trial-start-button"
import { iosOhneInstallation, pushAktivieren, pushVerfuegbar, type PushErgebnis } from "@/lib/push-client"
import type { KreuzenItem, KreuzenSource } from "@/lib/kreuzen-types"
import { LEARN_PLANS, LEARN_PLAN_IDS, type LearnPlanId } from "@/lib/learn-plans"
import { dayForDate, daysBetween, loadProgress, saveProgress, todayIso } from "@/lib/learn-plan-progress"
import { trackClient } from "@/lib/track-client"
import { POOL_LIMIT_ANON } from "@/lib/generator-plan-config"

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
  /** Lern-Erinnerung bereits eingeschaltet. */
  reminderOptIn: boolean
  /** Prüfungsreife je Plan (nur angemeldet). */
  reife: Record<LearnPlanId, Reife> | null
  /** 7-Tage-Pro-Testphase noch nicht genutzt. */
  trialEligible: boolean
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
const MISCHEN_KEY = "fragenkreuzen:kreuzen:wiederholungen"
const ERINNERUNG_GEFRAGT_KEY = "fragenkreuzen:kreuzen:erinnerung-gefragt"
/** Nach "Nein danke" frühestens in 14 Tagen erneut fragen. */
const ERINNERUNG_PAUSE_MS = 14 * 86_400_000

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

const PLAN_KEY = "fragenkreuzen:kreuzen:plan"
const EINSTIEG_KEY = "fragenkreuzen:kreuzen:einstieg"

type AktiverPlan = { planId: LearnPlanId; examDate: string | null }

/**
 * Aktiver Lernplan: der mit gesetztem Prüfungsdatum, sonst der im Einstieg
 * gewählte (dann ohne Countdown, Tag für Tag in Reihenfolge).
 */
function aktiverPlan(): AktiverPlan | null {
  for (const id of LEARN_PLAN_IDS) {
    const p = loadProgress(id)
    if (p.examDate) return { planId: id, examDate: p.examDate }
  }
  const gewaehlt = lesen<string | null>(PLAN_KEY, null)
  return gewaehlt === "m1" || gewaehlt === "m2" ? { planId: gewaehlt, examDate: null } : null
}

/** Ohne Prüfungsdatum: der erste noch nicht bearbeitete Tag. */
function naechsterOffenerTag(planId: LearnPlanId): number {
  const erledigt = new Set(loadProgress(planId).done)
  const tage = LEARN_PLANS[planId].days.map((d) => d.day)
  return tage.find((d) => !erledigt.has(d)) ?? tage[tage.length - 1] ?? 1
}

function quelleLabel(s: KreuzenSource): string {
  if (s.type === "topic") return s.topic
  if (s.type === "plan") return `${LEARN_PLANS[s.planId].shortLabel} · Tag ${s.day}`
  if (s.type === "weak") return "Schwächen"
  if (s.type === "fach") return s.fach
  if (s.type === "probe") return `Probeklausur · ${LEARN_PLANS[s.planId].shortLabel}`
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
  const [plan, setPlan] = useState<AktiverPlan | null>(null)
  const [geladen, setGeladen] = useState(false)
  const [einstiegFertig, setEinstiegFertig] = useState(true)
  // Neue Probeklausur = neue Instanz (Timer, Ergebnisse), auch bei gleichem Plan.
  const [probeNr, setProbeNr] = useState(0)
  const [heuteLokal, setHeuteLokal] = useState(0)
  // Ergebnisse dieser Sitzung (richtig/falsch) — Grundlage für Serien, Runden, Stufenvorschläge.
  const [ergebnisse, setErgebnisse] = useState<boolean[]>([])
  const [rundeGezeigtBei, setRundeGezeigtBei] = useState(0)
  const [zeigeRunde, setZeigeRunde] = useState(false)
  const [abgelehnt, setAbgelehnt] = useState<Set<number>>(() => new Set())
  const [staende, setStaende] = useState<Map<string, ThemenStand>>(() => new Map())
  const [letzterStand, setLetzterStand] = useState<ThemenStand | null>(null)
  const [erinnerungFrage, setErinnerungFrage] = useState(false)
  const [erinnerungLaedt, setErinnerungLaedt] = useState(false)
  const [erinnerungAn, setErinnerungAn] = useState(stats.reminderOptIn)
  const sitzung = { n: ergebnisse.length, richtig: ergebnisse.filter(Boolean).length }
  const [upgrading, setUpgrading] = useState(false)
  // Fällige Wiederholungen in den Strom einstreuen (Standard: ja — Abwechslung
  // festigt besser). Wer bei einem Thema bleiben will, schaltet es ab.
  const [mischen, setMischen] = useState(true)

  const buffer = useQuestionBuffer({ source, difficulty: stufe, loggedIn: isLoggedIn, mischen })

  // Gerätezustand laden
  useEffect(() => {
    const s = lesen<number>(STUFE_KEY, 3)
    setStufe(s >= 1 && s <= 5 ? s : 3)
    setThemen(lesen<string[]>(THEMEN_KEY, []))
    setMischen(lesen<boolean>(MISCHEN_KEY, true) !== false)
    setPlan(aktiverPlan())
    setEinstiegFertig(lesen<boolean>(EINSTIEG_KEY, false))
    setGeladen(true)
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

  // Stand im Thema ("7 von 9 sicher") kommt mit jeder verbuchten Antwort.
  useEffect(() => {
    const onStand = (e: Event) => {
      const d = (e as CustomEvent<ThemenStand>).detail
      if (!d?.topic) return
      setStaende((m) => new Map(m).set(d.topic, d))
      setLetzterStand(d)
    }
    window.addEventListener("fragenkreuzen:themenstand", onStand)
    return () => window.removeEventListener("fragenkreuzen:themenstand", onStand)
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
      toast.success("Pro aktiviert — kreuze, so viel du willst.")
      setIsPro(true)
      buffer.erneut()
      router.replace("/kreuzen", { scroll: false })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const heute = Math.max(stats.heute, heuteLokal)
  // Ohne Konto ist das Tagesziel das Kontingent — ein unerreichbares Ziel demotiviert.
  const ziel = !isLoggedIn ? POOL_LIMIT_ANON : stats.dailyGoal > 0 ? stats.dailyGoal : 30

  const planHeute = useMemo(() => {
    if (!plan) return null
    if (!plan.examDate) return { ...plan, tag: naechsterOffenerTag(plan.planId), rest: null as number | null }
    const tag = dayForDate(plan.planId, plan.examDate, todayIso())
    const rest = daysBetween(todayIso(), plan.examDate)
    if (tag === null || rest === null) return null
    return { ...plan, tag, rest: rest as number | null }
  }, [plan])

  function planSetzen(planId: LearnPlanId, examDate: string | null) {
    const p = loadProgress(planId)
    saveProgress(planId, { ...p, examDate })
    // Nur ein Plan ist aktiv: Datum beim anderen entfernen.
    for (const id of LEARN_PLAN_IDS) {
      if (id !== planId) {
        const o = loadProgress(id)
        if (o.examDate) saveProgress(id, { ...o, examDate: null })
      }
    }
    schreiben(PLAN_KEY, planId)
    setPlan({ planId, examDate })
  }

  function einstiegAbschliessen(e: EinstiegErgebnis) {
    schreiben(EINSTIEG_KEY, true)
    setEinstiegFertig(true)
    trackClient("session_start", { via: "einstieg", art: e.art })
    if (e.art === "stoebern") return
    planSetzen(e.planId, e.examDate)
    stufeSetzen(e.stufe)
    if (isLoggedIn) {
      void fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ examTarget: e.planId === "m1" ? "Physikum" : "M2" }),
      }).catch(() => {})
    }
    // Ohne Umweg in die erste Frage.
    const tag = e.examDate ? (dayForDate(e.planId, e.examDate, todayIso()) ?? 1) : naechsterOffenerTag(e.planId)
    starten({ type: "plan", planId: e.planId, day: tag })
  }

  function probeStarten(planId: LearnPlanId) {
    setProbeNr((n) => n + 1)
    starten({ type: "probe", planId })
  }

  function starten(s: KreuzenSource) {
    setErgebnisse([])
    setRundeGezeigtBei(0)
    setZeigeRunde(false)
    setAbgelehnt(new Set())
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
      setErgebnisse((e) => [...e, correct])
      setHeuteLokal((n) => {
        const neu = Math.max(n, stats.heute) + 1
        schreiben(HEUTE_KEY, { tag: todayIso(), n: neu })
        if (neu === ziel) {
          // Bester Moment für das Erinnerungs-Angebot: gerade etwas geschafft.
          const zuletzt = lesen<number>(ERINNERUNG_GEFRAGT_KEY, 0)
          if (isLoggedIn && !erinnerungAn && Date.now() - zuletzt > ERINNERUNG_PAUSE_MS) setErinnerungFrage(true)
          else toast.success(`Tagesziel geschafft: ${ziel} Fragen!`, { description: "Alles ab jetzt ist Vorsprung." })
        }
        return neu
      })
      // Plantag als bearbeitet vermerken (gleicher Fortschritt wie im Generator).
      if (source?.type === "plan") {
        const p = loadProgress(source.planId)
        if (!p.done.includes(source.day)) saveProgress(source.planId, { ...p, done: [...p.done, source.day] })
      }
    },
    [buffer, source, stats.heute, ziel, isLoggedIn, erinnerungAn]
  )

  async function erinnerungJa() {
    setErinnerungLaedt(true)
    try {
      // Bevorzugt aufs Handy (Push); wo das nicht geht, per Mail.
      let push: PushErgebnis = "nicht_verfuegbar"
      if (pushVerfuegbar() && !iosOhneInstallation()) push = await pushAktivieren()
      if (push !== "an") {
        const res = await fetch("/api/account/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ optIn: true }),
        })
        if (!res.ok) throw new Error()
      }
      setErinnerungAn(true)
      setErinnerungFrage(false)
      toast.success(push === "an" ? "Erinnerung aufs Handy ist an." : "Erinnerung per Mail ist an.", {
        description:
          push === "abgelehnt"
            ? "Benachrichtigungen sind im Browser blockiert — deshalb per Mail. Abschalten jederzeit im Account."
            : iosOhneInstallation()
              ? "Tipp: Zum Home-Bildschirm hinzufügen, dann geht es auch als Benachrichtigung."
              : "Abschalten jederzeit im Account.",
      })
    } catch {
      toast.error("Konnte nicht gespeichert werden.")
    } finally {
      setErinnerungLaedt(false)
    }
  }

  function erinnerungNein() {
    schreiben(ERINNERUNG_GEFRAGT_KEY, Date.now())
    setErinnerungFrage(false)
  }

  // Flow: Serie feiern, Stufe anbieten.
  const aktuelleSerie = serie(ergebnisse)
  const meilenstein = serienMeilenstein(aktuelleSerie)
  const vorschlag = stufenVorschlag(ergebnisse, stufe, abgelehnt)

  function weiterImStrom() {
    // Alle 10 Fragen eine kurze Rundenbilanz statt sofort der nächsten Frage.
    if (rundeFaellig(ergebnisse.length, rundeGezeigtBei)) {
      setRundeGezeigtBei(ergebnisse.length)
      setZeigeRunde(true)
      window.scrollTo({ top: 0 })
      return
    }
    buffer.weiter()
    window.scrollTo({ top: 0 })
  }

  function stufeWechseln(neu: number) {
    stufeSetzen(neu)
    // Die neue Stufe hat ihren eigenen Vorrat; die Serie beginnt dort neu.
    setErgebnisse([])
    setRundeGezeigtBei(0)
  }

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
  if (source?.type === "probe") {
    return (
      <ProbeKlausur
        key={probeNr}
        planId={source.planId}
        buffer={buffer}
        onHome={() => setSource(null)}
        onNeu={() => probeStarten(source.planId)}
        onFachUeben={(fach) => starten({ type: "fach", planId: source.planId, fach })}
      />
    )
  }

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
            <div className="truncate text-xs tabular-nums text-muted-foreground">
              {sitzung.n > 0 ? `${sitzung.richtig}/${sitzung.n} richtig · ` : ""}
              {heute}/{ziel} heute
              {(() => {
                const st = source.type === "topic" ? staende.get(source.topic) : null
                return st && st.gesamt > 0 ? ` · ${st.sicher} von ${st.gesamt} sicher` : ""
              })()}
            </div>
          </div>
          {buffer.offline && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <WifiOff className="h-3.5 w-3.5" aria-hidden /> {buffer.vorrat + (item ? 1 : 0)} offline
            </span>
          )}
          {item?.kind === "due" && source.type !== "due" && (
            <span
              className="inline-flex max-w-[45%] items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              title={`Fällige Wiederholung aus „${item.topic}“`}
            >
              <Repeat className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">Wiederholung · {item.topic}</span>
            </span>
          )}
        </div>

        <div className="mb-3 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, (heute / ziel) * 100)}%` }} />
        </div>

        {erinnerungFrage && <ErinnerungsAngebot laedt={erinnerungLaedt} onJa={erinnerungJa} onNein={erinnerungNein} />}

        {zeigeRunde ? (
          <RundenKarte
            runde={rundeGezeigtBei / 10}
            bilanz={rundenBilanz(ergebnisse)}
            themenStand={(source.type === "topic" ? staende.get(source.topic) : null) ?? letzterStand}
            stufe={stufe}
            onWeiter={() => {
              setZeigeRunde(false)
              buffer.weiter()
            }}
            onSchwerer={
              stufe < 5
                ? () => {
                    setZeigeRunde(false)
                    stufeWechseln(stufe + 1)
                  }
                : null
            }
            onHome={() => {
              setZeigeRunde(false)
              setSource(null)
            }}
          />
        ) : item ? (
          <QuestionCard
            key={item.key}
            item={item}
            onAnswered={(text, ms, correct) => beantwortet(item, text, ms, correct)}
            onNext={weiterImStrom}
            nachAufloesung={
              <FlowHinweis
                serie={meilenstein}
                vorschlag={vorschlag}
                onAnnehmen={() => vorschlag && stufeWechseln(vorschlag.stufe)}
                onAblehnen={() => vorschlag && setAbgelehnt((a) => new Set(a).add(vorschlag.stufe))}
              />
            }
            // Auch ohne Vorrat weiter, sobald nichts mehr lädt — dahinter wartet
            // dann der passende Hinweis (Kontingent, Fehler) statt eines toten Knopfs.
            canNext={buffer.vorrat > 0 || !buffer.laedt || rundeFaellig(ergebnisse.length, rundeGezeigtBei)}
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
            trialEligible={stats.trialEligible && !isPro}
            onTrialStarted={() => {
              setIsPro(true)
              buffer.erneut()
            }}
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
  // Erster Besuch ohne Plan und ohne Verlauf: geführter Einstieg statt leerer Seite.
  if (geladen && !einstiegFertig && !plan && themen.length === 0 && heute === 0) {
    return <Einstieg onFertig={einstiegAbschliessen} />
  }

  const anteil = Math.min(1, heute / ziel)
  const proTag = stats.woche / 7
  const reife = planHeute && stats.reife ? stats.reife[planHeute.planId] : null
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
            {planHeute.rest === null
              ? `${LEARN_PLANS[planHeute.planId].days.find((d) => d.day === planHeute.tag)?.subject ?? ""}`
              : planHeute.rest > 0
                ? `Noch ${planHeute.rest} Tage bis zur Prüfung`
                : "Prüfungstag — viel Erfolg!"}
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

      {planHeute &&
        (isLoggedIn && reife ? (
          <PruefungsreifeKarte
            planId={planHeute.planId}
            reife={reife}
            onUeben={(fach) => starten({ type: "fach", planId: planHeute.planId, fach })}
            onProbe={() => probeStarten(planHeute.planId)}
          />
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-semibold">Probeklausur {LEARN_PLANS[planHeute.planId].shortLabel}</div>
              <div className="text-muted-foreground">20 Fragen, 30 Minuten, Auswertung je Fach — mit kostenlosem Konto.</div>
            </div>
            <Link
              href="/register?callbackUrl=%2Fkreuzen"
              className="inline-flex h-10 shrink-0 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background"
            >
              Konto anlegen
            </Link>
          </div>
        ))}

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
        {isLoggedIn && (
          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 border-t px-1 pt-3 text-sm">
            <span>
              <span className="font-medium">Wiederholungen einstreuen</span>
              <span className="block text-xs text-muted-foreground">
                Jede 4. Frage ist eine fällige Wiederholung — auch aus anderen Themen.
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={mischen}
              onChange={(e) => {
                setMischen(e.target.checked)
                schreiben(MISCHEN_KEY, e.target.checked)
              }}
              className="h-5 w-5 shrink-0 accent-primary"
            />
          </label>
        )}
      </div>

      <PruefungsKarte
        plan={planHeute}
        proTag={proTag}
        quote7={stats.quote7}
        onSetzen={planSetzen}
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
  plan: { planId: LearnPlanId; examDate: string | null; tag: number; rest: number | null } | null
  proTag: number
  quote7: number | null
  onSetzen: (planId: LearnPlanId, examDate: string | null) => void
}) {
  const [bearbeiten, setBearbeiten] = useState(false)
  const [planId, setPlanId] = useState<LearnPlanId>(plan?.planId ?? "m2")
  const [datum, setDatum] = useState(plan?.examDate ?? "")

  function oeffnen() {
    setPlanId(plan?.planId ?? "m2")
    setDatum(plan?.examDate ?? "")
    setBearbeiten(true)
  }

  if (plan && plan.rest !== null && !bearbeiten) {
    const hoch = Math.round(proTag * Math.max(0, plan.rest))
    return (
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <CalendarClock className="h-4 w-4" aria-hidden /> {LEARN_PLANS[plan.planId].shortLabel} in {Math.max(0, plan.rest)} Tagen
          </div>
          <button type="button" onClick={oeffnen} className="text-xs text-muted-foreground hover:text-foreground">
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
        onClick={oeffnen}
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
  trialEligible,
  onTrialStarted,
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
  trialEligible: boolean
  onTrialStarted: () => void
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
            : "Mit Pro kreuzt du, so viel du willst — so viele Fragen, wie dein Kopf schafft."}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {!isLoggedIn ? (
            <Link
              href="/login?callbackUrl=/kreuzen"
              className="inline-flex h-12 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground"
            >
              Kostenlos anmelden
            </Link>
          ) : !isPro && trialEligible ? (
            // Erst die Testphase ohne Zahlungsdaten — der kleinste Schritt zu Pro.
            <>
              <TrialStartButton
                size="lg"
                className="h-12 w-full rounded-full"
                label="7 Tage Pro gratis — ohne Zahlungsdaten"
                onStarted={onTrialStarted}
              />
              {plaene.length > 1 ? (
                <PlanChooser choices={plaene} isLoggedIn={isLoggedIn} returnTo="/kreuzen" className="text-left" />
              ) : null}
            </>
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
