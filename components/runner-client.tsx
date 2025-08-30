// components/runner-client.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

type Option = { id: string; text: string; isCorrect: boolean; explanation?: string | null }
type Question = {
  id: string
  stem: string
  tip?: string | null
  explanation?: string | null
  options: Option[]
  media?: { id: string; url: string; alt: string; order: number }[]
  caseId?: string | null
  caseTitle?: string | null
  caseVignette?: string | null
  caseOrder?: number | null
  examId?: string | null
}

type LabValue = {
  id: string
  name: string
  unit: string
  refRange: string
  category: string
}

type FilterMode = "all" | "open" | "flagged" | "wrong"

type Props = {
  attemptId: string
  examId: string
  passPercent: number
  allowImmediateFeedback: boolean
  questions: Question[]
  initialAnswers: Record<string, string | undefined>
  initialElapsedSec?: number
  mode?: "exam" | "practice"
  initialFilterMode?: FilterMode
  initialExamMode?: boolean
}

// Zeitformat: mm:ss / hh:mm:ss
function formatUp(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return h > 0
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function RunnerClient(props: Props) {
  const {
    attemptId,
    allowImmediateFeedback,
    questions,
    initialAnswers,
    initialElapsedSec = 0,
    mode = "exam",
    initialFilterMode,
    initialExamMode,
  } = props
  const router = useRouter()

  // Lokale Persistenz Keys
  const LS_IDX = `examRun:${attemptId}:idx`
  const LS_MODE = `examRun:${attemptId}:examMode`
  const LS_ELAPSED = `examRun:${attemptId}:elapsedSec`
  const LS_FLAGGED = `examRun:${attemptId}:flagged`
  const LS_FILTER = `examRun:${attemptId}:filter`

  // Index/Antworten
  const [idx, setIdx] = useState(() => {
    if (typeof window === "undefined") return 0
    const raw = window.localStorage.getItem(LS_IDX)
    const i = raw ? parseInt(raw, 10) : 0
    return Number.isFinite(i) ? Math.min(Math.max(i, 0), Math.max(questions.length - 1, 0)) : 0
  })
  const [answers, setAnswers] = useState<Record<string, string | undefined>>(initialAnswers)
  const [submitting, setSubmitting] = useState(false)

  // Timer
  const lsElapsedAtMount = (() => {
    if (typeof window === "undefined") return 0
    const raw = window.localStorage.getItem(LS_ELAPSED)
    const v = raw ? parseInt(raw, 10) : 0
    return Number.isFinite(v) ? Math.max(0, v) : 0
  })()
  const [elapsed, setElapsed] = useState<number>(Math.max(initialElapsedSec, lsElapsedAtMount))
  const [running, setRunning] = useState(true)

  // Heartbeat-Steuerung
  const lastSentRef = useRef<number>(0)
  const sendingRef = useRef<boolean>(false)
  const HEARTBEAT_MS = 10_000

  function persistElapsedToLS(value: number) {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_ELAPSED, String(Math.max(0, Math.floor(value))))
      }
    } catch {}
  }

  async function sendHeartbeat(nowSec?: number) {
    if (mode === "practice") return
    try {
      const value = typeof nowSec === "number" ? nowSec : elapsed
      persistElapsedToLS(value)
      if (sendingRef.current) return
      if (Date.now() - lastSentRef.current < 2000) return
      sendingRef.current = true
      await fetch(`/api/attempts/${attemptId}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elapsedSec: Math.max(0, Math.floor(value)) }),
        keepalive: true,
      })
      lastSentRef.current = Date.now()
    } catch {
    } finally {
      sendingRef.current = false
    }
  }

  // Ticker
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setElapsed(v => {
      const nv = v + 1
      persistElapsedToLS(nv)
      return nv
    }), 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  // periodischer Heartbeat (nur Exam)
  useEffect(() => {
    if (mode === "practice") return
    const t = setInterval(() => { if (running) sendHeartbeat() }, HEARTBEAT_MS)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, attemptId, mode])

  // Sichtbarkeit / (Page)Unload – nur Exam
  useEffect(() => {
    if (mode === "practice") return
    function onVis() {
      if (document.hidden) {
        persistElapsedToLS(elapsed)
        sendHeartbeat(elapsed)
      }
    }
    function onBeforeUnload() {
      try {
        const val = Math.max(0, Math.floor(elapsed))
        persistElapsedToLS(val)
        const data = new Blob([JSON.stringify({ elapsedSec: val })], { type: "application/json" })
        if (navigator.sendBeacon) {
          navigator.sendBeacon(`/api/attempts/${attemptId}/heartbeat`, data)
        } else {
          fetch(`/api/attempts/${attemptId}/heartbeat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ elapsedSec: val }),
            keepalive: true,
          }).catch(() => {})
        }
      } catch {}
    }
    function onPageHide() {
      persistElapsedToLS(elapsed)
      const val = Math.max(0, Math.floor(elapsed))
      try {
        const data = new Blob([JSON.stringify({ elapsedSec: val })], { type: "application/json" })
        navigator.sendBeacon?.(`/api/attempts/${attemptId}/heartbeat`, data)
      } catch {}
    }
    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("beforeunload", onBeforeUnload as any)
    window.addEventListener("pagehide", onPageHide)
    return () => {
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("beforeunload", onBeforeUnload as any)
      window.removeEventListener("pagehide", onPageHide)
      persistElapsedToLS(elapsed)
      try {
        const val = Math.max(0, Math.floor(elapsed))
        const data = new Blob([JSON.stringify({ elapsedSec: val })], { type: "application/json" })
        navigator.sendBeacon?.(`/api/attempts/${attemptId}/heartbeat`, data)
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, attemptId, mode])

  // Prüfungsmodus / Sofort-Feedback
  const [examMode, setExamMode] = useState<boolean>(() => {
    const fromLs = typeof window !== "undefined" ? window.localStorage.getItem(LS_MODE) : null
    if (fromLs != null) return fromLs === "1"
    if (typeof initialExamMode === "boolean") return initialExamMode
    return true
  })
  const showFeedback = allowImmediateFeedback && !examMode

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const overlayRef = useRef<HTMLDivElement | null>(null)

  // Laborwerte
  const [labOpen, setLabOpen] = useState(false)
  const [labLoading, setLabLoading] = useState(false)
  const [labError, setLabError] = useState<string | null>(null)
  const [labValues, setLabValues] = useState<LabValue[]>([])
  const [labQuery, setLabQuery] = useState("")
  const filteredLabs = useMemo(() => {
    const t = labQuery.trim().toLowerCase()
    if (!t) return labValues
    return labValues.filter(lv =>
      [lv.name, lv.unit, lv.refRange, lv.category].filter(Boolean).some(s => s.toLowerCase().includes(t))
    )
  }, [labValues, labQuery])

  // Kommentare & Erklärungen
  const [tipOpen, setTipOpen] = useState(false)
  const [qExpOpen, setQExpOpen] = useState(false)
  const [optOpen, setOptOpen] = useState<Record<string, boolean>>({})

  // Markierungen & Filter
  const [flagged, setFlagged] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {}
    try {
      const raw = window.localStorage.getItem(LS_FLAGGED)
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
    } catch { return {} }
  })

  // Initiale Flags vom Server ziehen (einmalig)
  useEffect(() => {
    if (questions.length === 0) return
    const ids = questions.map(q => q.id).join(",")
    ;(async () => {
      try {
        const res = await fetch(`/api/questions/flags?ids=${encodeURIComponent(ids)}`)
        const j = await res.json().catch(() => null)
        const serverFlags = (j?.flags || {}) as Record<string, boolean>
        if (serverFlags && typeof serverFlags === "object") {
          setFlagged(prev => {
            const merged = { ...prev }
            for (const [qid, v] of Object.entries(serverFlags)) merged[qid] = !!v
            try { window.localStorage.setItem(LS_FLAGGED, JSON.stringify(merged)) } catch {}
            return merged
          })
        }
      } catch {}
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter-Init
  const [filterMode, setFilterMode] = useState<FilterMode>(() => {
    if (typeof window === "undefined") return initialFilterMode ?? "all"
    const raw = window.localStorage.getItem(LS_FILTER)
    if (raw === "all" || raw === "open" || raw === "flagged" || raw === "wrong") return raw
    return initialFilterMode ?? "all"
  })

  // Seitenleiste (Mobile Bottom-Sheet)
  const [navOpen, setNavOpen] = useState(false)
  const [sheetDragY, setSheetDragY] = useState(0)

  // Aktuelle Frage
  const q = questions[idx]
  const given = answers[q.id]
  const isCurrentFlagged = !!flagged[q.id]
  const media = (q.media ?? []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const hasTip = !!(q.tip && q.tip.trim().length)
  const hasQExplanation = !!(q.explanation && q.explanation.trim().length)

  // Gruppen
  const groups = useMemo(() => {
    const res: { id: string | null; label: string; indices: number[]; order: number }[] = []
    const byId = new Map<string | null, number>()
    questions.forEach((qu, i) => {
      const key = qu.caseId ?? null
      if (!byId.has(key)) {
        const order = qu.caseOrder ?? 0
        const label = key ? (qu.caseTitle || "Fall") : "Einzelfragen"
        byId.set(key, res.length)
        res.push({ id: key, label, indices: [i], order })
      } else {
        res[byId.get(key)!].indices.push(i)
      }
    })
    return res.sort((a, b) => {
      if (a.id === null && b.id !== null) return 1
      if (a.id !== null && b.id === null) return -1
      return a.order - b.order
    })
  }, [questions])

  // Counters & Ziel-Listen
  const openIndices = useMemo(
    () => questions.map((_, i) => i).filter(i => !answers[questions[i].id]),
    [answers, questions]
  )
  const flaggedIndices = useMemo(
    () => questions.map((_, i) => i).filter(i => !!flagged[questions[i].id]),
    [flagged, questions]
  )
  const wrongIndices = useMemo(() => {
    return questions.map((q, i) => {
      const aid = answers[q.id]
      if (!aid) return -1
      const opt = q.options.find(o => o.id === aid)
      return opt && !opt.isCorrect ? i : -1
    }).filter(i => i >= 0)
  }, [answers, questions])

  const counts = useMemo(() => ({
    total: questions.length,
    open: openIndices.length,
    flagged: flaggedIndices.length,
    wrong: wrongIndices.length,
  }), [questions.length, openIndices.length, flaggedIndices.length, wrongIndices.length])

  // Sichtbare Indizes je Filter
  const filteredIndices = useMemo(() => {
    if (filterMode === "flagged") return flaggedIndices
    if (filterMode === "wrong")   return wrongIndices
    if (filterMode === "open")    return openIndices
    return questions.map((_, i) => i)
  }, [filterMode, flaggedIndices, wrongIndices, openIndices, questions])

  // Beim Filterwechsel ggf. springen
  useEffect(() => {
    if (filteredIndices.length === 0) return
    if (!filteredIndices.includes(idx)) setIdx(filteredIndices[0])
  }, [filteredIndices, idx])

  const noResultsMessage = useMemo(() => {
    switch (filterMode) {
      case "open":    return "Keine offene Frage."
      case "flagged": return "Keine markierte Frage."
      case "wrong":   return "Keine falsche Frage."
      default:        return ""
    }
  }, [filterMode])

  const filteredPos = useMemo(() => filteredIndices.indexOf(idx), [filteredIndices, idx])
  const atStart     = filteredIndices.length === 0 || filteredPos <= 0
  const atEnd       = filteredIndices.length === 0 || filteredPos >= filteredIndices.length - 1

  function nextInFiltered(dir: 1 | -1) {
    if (filteredIndices.length === 0) return
    const pos = filteredIndices.indexOf(idx)
    if (pos === -1) { setIdx(filteredIndices[0]); return }
    const nextPos = Math.min(Math.max(pos + dir, 0), filteredIndices.length - 1)
    setIdx(filteredIndices[nextPos])
  }

  // Persistenzen
  useEffect(() => { try { window.localStorage.setItem(LS_FILTER, filterMode) } catch {} }, [filterMode])
  useEffect(() => { try { window.localStorage.setItem(LS_FLAGGED, JSON.stringify(flagged)) } catch {} }, [flagged])
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem(LS_IDX, String(idx)) }, [idx])
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem(LS_MODE, examMode ? "1" : "0") }, [examMode])

  // Practice: Session beenden
  function endPractice() {
    if (!confirm("Session beenden? Es gibt keine Auswertung; lokale Fortschritte werden verworfen.")) return
    try { persistElapsedToLS(elapsed) } catch {}
    try {
      window.localStorage.removeItem(LS_IDX)
      window.localStorage.removeItem(LS_MODE)
      window.localStorage.removeItem(LS_ELAPSED)
      window.localStorage.removeItem(LS_FLAGGED)
      window.localStorage.removeItem(LS_FILTER)
    } catch {}
    router.push("/decks")
  }

  // Filter-Matching (für Rail / Sheet)
  function matchFilter(i: number) {
    if (filterMode === "open") return !answers[questions[i].id]
    if (filterMode === "flagged") return !!flagged[questions[i].id]
    if (filterMode === "wrong") {
      const aid = answers[questions[i].id]
      if (!aid) return false
      const opt = questions[i].options.find(o => o.id === aid)
      return !!opt && !opt.isCorrect
    }
    return true
  }

  function currentTargetList(): number[] {
    if (filterMode === "flagged") return flaggedIndices
    if (filterMode === "wrong") return wrongIndices
    if (filterMode === "open") return openIndices
    return openIndices
  }

  function nextTargetIndex(): number {
    const list = currentTargetList()
    if (list.length === 0) return -1
    const after = list.find(x => x > idx)
    return typeof after === "number" ? after : list[0]
  }

  function goNextTarget() {
    const ni = nextTargetIndex()
    if (ni >= 0) setIdx(ni)
  }

  // Markieren mit Server-Persistenz
  function toggleFlagCurrent() {
    const id = q.id
    const willBe = !flagged[id]
    setFlagged(f => {
      const nf = { ...f, [id]: willBe }
      try { window.localStorage.setItem(LS_FLAGGED, JSON.stringify(nf)) } catch {}
      return nf
    })
    fetch(`/api/questions/${id}/flag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flagged: willBe }),
    }).catch(() => {})
  }

  // Antwort wählen
  async function choose(optionId: string) {
    setSubmitting(true)
    try {
      if (mode === "practice") {
        await fetch(`/api/practice/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: q.id, answerOptionId: optionId }),
        }).catch(() => {})
        setAnswers(a => ({ ...a, [q.id]: optionId }))
      } else {
        const res = await fetch(`/api/attempts/${attemptId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: q.id, answerOptionId: optionId }),
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(j?.error || "Antwort konnte nicht gespeichert werden.")
        setAnswers(a => ({ ...a, [q.id]: optionId }))
      }
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  // Exam-Finish
  async function finish() {
    if (mode === "practice") return
    if (!confirm("Prüfung wirklich beenden und auswerten?")) return
    setSubmitting(true)
    try {
      persistElapsedToLS(elapsed)
      await sendHeartbeat(elapsed)
      const res = await fetch(`/api/attempts/${attemptId}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elapsedSec: Math.max(0, Math.floor(elapsed)) }),
        keepalive: true,
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Konnte nicht auswerten.")
      try {
        window.localStorage.removeItem(LS_IDX)
        window.localStorage.removeItem(LS_MODE)
        window.localStorage.removeItem(LS_ELAPSED)
        window.localStorage.removeItem(LS_FLAGGED)
        window.localStorage.removeItem(LS_FILTER)
      } catch {}
      router.push(`/dashboard/history/${attemptId}`)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const progress = useMemo(() => {
    const answered = Object.values(answers).filter(Boolean).length
    return `${answered}/${questions.length}`
  }, [answers, questions.length])

  // ---------- Deck-Speichern ----------
  type MyDeck = { id: string; title: string }
  const [saveOpen, setSaveOpen] = useState(false)
  const [decksLoading, setDecksLoading] = useState(false)
  const [decksError, setDecksError] = useState<string | null>(null)
  const [myDecks, setMyDecks] = useState<MyDeck[]>([])
  const [selectedDeckIds, setSelectedDeckIds] = useState<Record<string, boolean>>({})
  const [saveBusy, setSaveBusy] = useState(false)

  function toggleDeck(id: string) {
    setSelectedDeckIds(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function openSaveModal() {
    setSaveOpen(true)
    if (myDecks.length > 0 || decksLoading) return
    setDecksLoading(true)
    setDecksError(null)
    try {
      const res = await fetch("/api/decks/mine", { cache: "no-store" })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Konnte Decks nicht laden.")
      const items = Array.isArray(j?.items) ? j.items : []
      const normalized: MyDeck[] = items.map((d: any) => ({
        id: String(d.id),
        title: String(d.title ?? d.name ?? "Deck"),
      }))
      setMyDecks(normalized)
    } catch (e) {
      setDecksError((e as Error).message || "Decks konnten nicht geladen werden.")
    } finally {
      setDecksLoading(false)
    }
  }

  async function saveToDecks() {
    const ids = Object.keys(selectedDeckIds).filter(k => selectedDeckIds[k])
    if (ids.length === 0) {
      alert("Bitte wähle mindestens ein Deck aus.")
      return
    }
    setSaveBusy(true)
    try {
      const res = await fetch("/api/decks/add-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, deckIds: ids }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || "Konnte die Frage nicht speichern.")
      }
      setSaveOpen(false)
      setSelectedDeckIds({})
      alert("Gespeichert.")
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSaveBusy(false)
    }
  }

  // ---------- Shortcuts ----------
  useEffect(() => {
    function isTyping() {
      const ae = document.activeElement as HTMLElement | null
      if (!ae) return false
      const tag = ae.tagName.toLowerCase()
      return tag === "input" || tag === "textarea" || ae.isContentEditable
    }
    function onKey(e: KeyboardEvent) {
      if (lightboxOpen) {
        if (e.key === "Escape") { setLightboxOpen(false); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}) }
        if (e.key === "ArrowRight") setLightboxIndex(i => (i + 1) % Math.max(1, media.length))
        if (e.key === "ArrowLeft") setLightboxIndex(i => (i - 1 + Math.max(1, media.length)) % Math.max(1, media.length))
        return
      }
      if (labOpen) { if (e.key === "Escape") setLabOpen(false); return }

      if (e.key.toLowerCase() === "p") { e.preventDefault(); setRunning(r => !r); return }
      if (e.key.toLowerCase() === "f") { e.preventDefault(); setNavOpen(v => !v); return }
      if (e.key.toLowerCase() === "l") { if (!isTyping()) { e.preventDefault(); setLabOpen(true) } return }

      if (isTyping()) return

      if (e.key.toLowerCase() === "m") { e.preventDefault(); toggleFlagCurrent(); return }
      if (e.key.toLowerCase() === "u") { e.preventDefault(); goNextTarget(); return }

      if (e.key === "Enter") { e.preventDefault(); nextInFiltered(1); return }

      if (/^[1-4]$/.test(e.key)) {
        const n = Number(e.key) - 1
        const opt = q.options[n]
        if (opt) { e.preventDefault(); choose(opt.id) }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, labOpen, media.length, q.options, answers, idx, filterMode, flagged, filteredIndices])

  useEffect(() => {
    if (lightboxOpen) overlayRef.current?.requestFullscreen?.().catch(() => {})
  }, [lightboxOpen])

  // Laborwerte lazy laden
  useEffect(() => {
    if (!labOpen || labValues.length > 0 || labLoading) return
    ;(async () => {
      setLabLoading(true); setLabError(null)
      try {
        const res = await fetch("/api/labs")
        const raw = await res.json().catch(() => null)
        const arr = (Array.isArray(raw) ? raw : (raw?.items || raw?.labs || raw?.data || [])) as any[]
        const norm: LabValue[] = (arr || []).map((x) => ({
          id: String(x.id ?? `${x.name}-${x.unit}`),
          name: String(x.name ?? ""),
          unit: String(x.unit ?? ""),
          refRange: String(x.refRange ?? x.ref_range ?? ""),
          category: String(x.category ?? ""),
        }))
        setLabValues(norm)
      } catch {
        setLabError("Laborwerte konnten nicht geladen werden.")
      } finally {
        setLabLoading(false)
      }
    })()
  }, [labOpen, labValues.length, labLoading])

  // Swipe (mobil)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  function onTouchStart(e: any) {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  function onTouchEnd(e: any) {
    if (!touchStart.current) return
    const t0 = touchStart.current
    const t = e.changedTouches[0]
    const dx = t.clientX - t0.x
    const dy = t.clientY - t0.y
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)
    if (absX > 60 && absY < 40) {
      if (dx < 0) nextInFiltered(1)
      else nextInFiltered(-1)
    }
    touchStart.current = null
  }

  // UI
  const primaryJumpLabel =
    filterMode === "flagged" ? "Nächste markierte"
    : filterMode === "wrong" ? "Nächste falsche"
    : "Nächste offene"

  const hasPrimaryJump = currentTargetList().length > 0
  const canShowWrongChip = mode === "practice" || showFeedback

  return (
    <div className="relative block lg:flex lg:items-start lg:gap-6">
      {/* Left-Rail */}
      <aside className="hidden lg:block lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-[16rem] lg:flex-none rounded border p-3 overflow-y-auto">
        <div className="mb-2 text-sm font-semibold">Fragen</div>

        {/* Filter-Chips */}
        <div className="mb-3 flex flex-wrap gap-2">
          <Button size="sm" variant={filterMode === "all" ? "default" : "outline"} onClick={() => setFilterMode("all")}>
            Alle ({counts.total})
          </Button>
          <Button size="sm" variant={filterMode === "open" ? "default" : "outline"} onClick={() => setFilterMode("open")}>
            Offen ({counts.open})
          </Button>
          <Button size="sm" variant={filterMode === "flagged" ? "default" : "outline"} onClick={() => setFilterMode("flagged")}>
            Markiert ({counts.flagged})
          </Button>
          {canShowWrongChip && (
            <Button size="sm" variant={filterMode === "wrong" ? "default" : "outline"} onClick={() => setFilterMode("wrong")}>
              Falsch ({counts.wrong})
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {groups.map((g, gi) => {
            const visible = g.indices.filter(matchFilter)
            if (visible.length === 0) return null
            return (
              <div key={`${g.id ?? "single"}-rail-${gi}`} className="space-y-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {g.id ? g.label : "Einzelfragen"}
                </div>
                <div className="flex flex-wrap gap-2">
                  {visible.map((i) => {
                    const n = i + 1
                    const answered = !!answers[questions[i].id]
                    const isCurrent = i === idx
                    const isFlagged = !!flagged[questions[i].id]
                    return (
                      <button
                        key={`rail-btn-${i}`}
                        onClick={() => setIdx(i)}
                        className={[
                          "relative h-9 w-9 rounded-full border text-sm font-medium grid place-items-center transition",
                          answered ? "bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:text-green-300" : "bg-muted/40",
                          isCurrent ? "ring-2 ring-blue-500" : "hover:shadow-sm",
                        ].join(" ")}
                        title={
                          (isFlagged ? "⭐ " : "") +
                          (answered ? `Frage ${n} – beantwortet` : `Frage ${n} – offen`)
                        }
                      >
                        {n}
                        {isFlagged && <span className="absolute -top-1 -right-1 text-[11px] leading-none">★</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 border-t pt-2 text-[11px] text-muted-foreground space-y-1">
          <div>✓ Grün = beantwortet</div>
          <div>• Ring = aktuell</div>
          <div>★ = markiert</div>
        </div>
      </aside>

      {/* Hauptbereich */}
      <div className="relative lg:flex-1 lg:min-w-0">
        {/* Kopfzeile */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setNavOpen(true)} title="Fragenübersicht (F)" className="lg:hidden">
              Fragen
            </Button>
            <span>Frage {idx + 1} / {questions.length} ({progress})</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sofort-Feedback: in beiden Modi sichtbar, wenn erlaubt */}
            {allowImmediateFeedback && (
              <label className="flex items-center gap-2" title="Wenn an: sofort zeigen, ob richtig/falsch">
                <input
                  type="checkbox"
                  checked={!examMode}
                  onChange={(e) => setExamMode(!e.target.checked)}
                />
                Sofort-Feedback
              </label>
            )}

            {mode === "exam" && (
              <span className="text-xs text-muted-foreground">
                {examMode ? "Prüfungsmodus aktiv (kein Direktfeedback)" : "Prüfungsmodus: Direktfeedback an"}
              </span>
            )}

            {/* Markieren */}
            <Button
              variant={isCurrentFlagged ? "default" : "outline"}
              onClick={toggleFlagCurrent}
              title={isCurrentFlagged ? "Markierung entfernen (M)" : "Frage markieren (M)"}
              aria-pressed={isCurrentFlagged}
            >
              {isCurrentFlagged ? "★ Markiert" : "☆ Markieren"}
            </Button>

            {/* In Decks speichern */}
            <Button variant="outline" onClick={openSaveModal} title="Diese Frage in eigene Decks ablegen">
              In Decks speichern
            </Button>

            <Button variant="outline" onClick={() => setLabOpen(true)} title="Laborwerte (L)">Laborwerte</Button>

            <div className="flex items-center gap-2">
              <span>Zeit: {formatUp(elapsed)}</span>
              <Button variant="outline" onClick={() => setRunning(r => !r)} title="Timer pausieren/fortsetzen (P)">
                {running ? "Pause" : "Weiter"}
              </Button>
            </div>
          </div>
        </div>

        {/* Kartenbereich */}
        {filteredIndices.length === 0 ? (
          <div className="rounded border bg-secondary/40 p-6 text-sm text-muted-foreground">{noResultsMessage}</div>
        ) : (
          <div className="card card-body space-y-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {(q.caseTitle || q.caseVignette) && (
              <div className="rounded border bg-secondary/40 p-4 space-y-1">
                <div className="font-semibold">{q.caseTitle || "Fall"}</div>
                {q.caseVignette && <div className="text-sm text-muted-foreground whitespace-pre-wrap">{q.caseVignette}</div>}
              </div>
            )}

            <p className="font-medium">{q.stem}</p>

            {/* Oberarztkommentar */}
            {hasTip && (
              <div className="rounded border bg-secondary/40">
                <button
                  type="button"
                  onClick={() => setTipOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium"
                  aria-expanded={tipOpen}
                  aria-controls="tip-content"
                >
                  <span>Oberarztkommentar</span>
                  <svg className={`h-4 w-4 transition-transform ${tipOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                  </svg>
                </button>
                {tipOpen && (
                  <div id="tip-content" className="px-3 pb-3 text-sm text-muted-foreground whitespace-pre-wrap">
                    {q.tip}
                  </div>
                )}
              </div>
            )}

            {/* Medien */}
            {media.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {media.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setLightboxIndex(i); setLightboxOpen(true) }}
                    className="group relative rounded border overflow-hidden focus:outline-none focus:ring focus:ring-blue-500 cursor-zoom-in"
                    title={m.alt || "Bild vergrößern"}
                    aria-label="Bild vergrößern"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.url}
                      alt={m.alt || ""}
                      className="h-28 w-40 object-cover transition-transform duration-200 ease-out group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                  </button>
                ))}
              </div>
            )}

            {/* Optionen */}
            <div className="space-y-2">
              {q.options.map(o => {
                const isSelected = given === o.id
                const canExplain = showFeedback && !!given
                const open = !!optOpen[o.id]
                return (
                  <div key={o.id} className="rounded border">
                    <button
                      onClick={() => (canExplain ? setOptOpen(s => ({ ...s, [o.id]: !s[o.id] })) : choose(o.id))}
                      disabled={submitting}
                      className={[
                        "w-full text-left px-3 py-2 transition-shadow flex items-center justify-between",
                        isSelected ? "border-blue-500 ring-1 ring-blue-500 rounded-t" : "rounded",
                        "bg-transparent"
                      ].join(" ")}
                      aria-expanded={canExplain ? open : undefined}
                      title={isSelected ? (o.isCorrect ? "Deine Antwort: richtig" : "Deine Antwort: falsch") : "Antwort auswählen"}
                    >
                      <span>
                        {o.text}
                        {showFeedback && isSelected && (
                          <span className={`ml-2 text-xs ${o.isCorrect ? "text-green-600" : "text-red-600"}`}>
                            {o.isCorrect ? "✓ richtig" : "✗ falsch"}
                          </span>
                        )}
                      </span>
                      {canExplain && (
                        <svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                        </svg>
                      )}
                    </button>
                    {canExplain && open && o.explanation && (
                      <div className="px-3 pb-3 text-sm text-muted-foreground whitespace-pre-wrap">
                        {o.explanation}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Frage-Gesamterklärung */}
            {hasQExplanation && showFeedback && !!given && (
              <div className="rounded border bg-secondary/40">
                <button
                  type="button"
                  onClick={() => setQExpOpen(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium"
                  aria-expanded={qExpOpen}
                >
                  <span>Erklärung</span>
                  <svg className={`h-4 w-4 transition-transform ${qExpOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                  </svg>
                </button>
                {qExpOpen && (
                  <div className="px-3 pb-3 text-sm text-muted-foreground whitespace-pre-wrap">
                    {q.explanation}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation unten */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => nextInFiltered(-1)} disabled={atStart}>Zurück</Button>
            <Button variant="outline" onClick={() => nextInFiltered(1)} disabled={atEnd}>Weiter</Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={goNextTarget}
              disabled={!hasPrimaryJump}
              title={
                filterMode === "flagged"
                  ? "Zur nächsten markierten Frage springen (U)"
                  : filterMode === "wrong"
                  ? "Zur nächsten falschen Frage springen (U)"
                  : "Zur nächsten offenen Frage springen (U)"
              }
            >
              {primaryJumpLabel}
            </Button>

            {mode === "exam" ? (
              <Button variant="destructive" onClick={finish} disabled={submitting}>Beenden & Auswerten</Button>
            ) : (
              <Button variant="secondary" onClick={endPractice}>Session beenden</Button>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && media.length > 0 && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="Bildanzeige"
          className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4"
          onClick={() => {
            setLightboxOpen(false)
            if (typeof document !== "undefined" && document.fullscreenElement) {
              document.exitFullscreen().catch(() => {})
            }
          }}
        >
          <div className="relative max-w-[95vw] max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setLightboxOpen(false)
                if (typeof document !== "undefined" && document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {})
                }
              }}
              className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-white/90 text-black text-xl leading-none grid place-items-center shadow"
              aria-label="Schließen"
            >
              ×
            </button>

            {media.length > 1 && (
              <>
                <button
                  onClick={() => setLightboxIndex(i => (i - 1 + media.length) % media.length)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-10 px-3 rounded-r bg-white/80 text-black shadow"
                  aria-label="Vorheriges Bild"
                >
                  ‹
                </button>
                <button
                  onClick={() => setLightboxIndex(i => (i + 1) % media.length)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 h-10 px-3 rounded-l bg-white/80 text-black shadow"
                  aria-label="Nächstes Bild"
                >
                  ›
                </button>
              </>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media[lightboxIndex].url}
              alt={media[lightboxIndex].alt || ""}
              className="max-h-[95vh] max-w-[95vw] object-contain select-none"
              draggable={false}
            />
          </div>
        </div>
      )}

      {/* ------- Laborwerte ------- */}
      {labOpen && (
        <div role="dialog" aria-modal="true" aria-label="Laborwerte" className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => setLabOpen(false)}>
          <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-lg border bg-white dark:bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold">Laborwerte</h2>
              <div className="flex items-center gap-2">
                <input
                  className="input h-9 w-64"
                  placeholder="Suchen (Name, Kategorie, Einheit)…"
                  value={labQuery}
                  onChange={(e) => setLabQuery(e.target.value)}
                  autoFocus
                />
                <Button variant="outline" onClick={() => setLabOpen(false)}>Schließen (Esc)</Button>
              </div>
            </div>

            <div className="p-0">
              {labLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Lade Laborwerte…</div>
              ) : labError ? (
                <div className="p-4 text-sm text-red-600">{labError}</div>
              ) : (
                <div className="max-h-[70vh] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-secondary">
                      <tr className="text-left">
                        <th className="px-4 py-2 font-medium">Name</th>
                        <th className="px-4 py-2 font-medium">Einheit</th>
                        <th className="px-4 py-2 font-medium">Referenz</th>
                        <th className="px-4 py-2 font-medium">Kategorie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLabs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                            Keine Treffer.
                          </td>
                        </tr>
                      ) : (
                        filteredLabs.map((lv) => (
                          <tr key={lv.id} className="odd:bg-muted/40">
                            <td className="px-4 py-2">{lv.name}</td>
                            <td className="px-4 py-2">{lv.unit}</td>
                            <td className="px-4 py-2">{lv.refRange}</td>
                            <td className="px-4 py-2">{lv.category}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="border-t px-4 py-2 text-xs text-muted-foreground">
                Tipp: <kbd className="px-1 py-0.5 rounded border">L</kbd> öffnen,&nbsp;
                <kbd className="px-1 py-0.5 rounded border">Esc</kbd> schließen,&nbsp;
                <kbd className="px-1 py-0.5 rounded border">P</kbd> Pause/Weiter.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------- Mobile Bottom-Sheet ------- */}
      {navOpen && <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setNavOpen(false)} />}

      <div
        className={`fixed bottom-0 left-0 right-0 z-[60] lg:hidden transform transition-transform ${navOpen ? "translate-y-0" : "translate-y-full"}`}
        style={{ transform: `translateY(${navOpen ? sheetDragY : 0}px)` }}
        onTouchStart={(e) => {
          if (!navOpen) return
          setSheetDragY(0)
          ;(e.target as HTMLElement).closest("[data-sheet]") && e.stopPropagation()
        }}
        onTouchMove={(e) => {
          if (!navOpen) return
          const dy = e.touches[0].clientY - (e.targetTouches[0]?.clientY ?? e.touches[0].clientY)
          setSheetDragY(prev => Math.max(0, prev + (Number.isFinite(dy) ? dy : 0)))
        }}
        onTouchEnd={() => {
          if (!navOpen) return
          if (sheetDragY > 100) { setNavOpen(false); setSheetDragY(0) }
          else setSheetDragY(0)
        }}
        aria-hidden={!navOpen}
      >
        <aside
          data-sheet
          className="rounded-t-xl border-t bg-white dark:bg-card shadow-xl max-h-[75vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle + Header */}
          <div className="pt-3">
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-muted" />
            <div className="px-4 pb-2 flex items-center justify-between">
              <div className="font-semibold">Fragenübersicht</div>
              <Button variant="outline" size="sm" onClick={() => setNavOpen(false)}>Schließen</Button>
            </div>
          </div>

          {/* Filter-Chips (mobil) */}
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            <Button size="sm" variant={filterMode === "all" ? "default" : "outline"} onClick={() => setFilterMode("all")}>
              Alle ({counts.total})
            </Button>
            <Button size="sm" variant={filterMode === "open" ? "default" : "outline"} onClick={() => setFilterMode("open")}>
              Offen ({counts.open})
            </Button>
            <Button size="sm" variant={filterMode === "flagged" ? "default" : "outline"} onClick={() => setFilterMode("flagged")}>
              Markiert ({counts.flagged})
            </Button>
            {canShowWrongChip && (
              <Button size="sm" variant={filterMode === "wrong" ? "default" : "outline"} onClick={() => setFilterMode("wrong")}>
                Falsch ({counts.wrong})
              </Button>
            )}
          </div>

          {/* Inhalt */}
          <div className="px-4 pb-4 overflow-y-auto max-h-[calc(75vh-88px)]">
            <div className="space-y-4">
              {groups.map((g, gi) => {
                const visible = g.indices.filter(matchFilter)
                if (visible.length === 0) return null
                return (
                  <div key={`${g.id ?? "single"}-sheet-${gi}`} className="space-y-2">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {g.id ? g.label : "Einzelfragen"}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {visible.map((i) => {
                        const n = i + 1
                        const answered = !!answers[questions[i].id]
                        const isCurrent = i === idx
                        const isFlagged = !!flagged[questions[i].id]
                        return (
                          <button
                            key={`sheet-btn-${i}`}
                            onClick={() => { setIdx(i); setNavOpen(false) }}
                            className={[
                              "relative h-9 w-9 rounded-full border text-sm font-medium grid place-items-center",
                              answered ? "bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:text-green-300" : "bg-muted/40",
                              isCurrent ? "ring-2 ring-blue-500" : "hover:shadow-sm",
                            ].join(" ")}
                            title={
                              (isFlagged ? "⭐ " : "") +
                              (answered ? `Frage ${n} – beantwortet` : `Frage ${n} – offen`)
                            }
                          >
                            {n}
                            {isFlagged && <span className="absolute -top-1 -right-1 text-[11px] leading-none">★</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 text-xs text-muted-foreground">
              Tipp:&nbsp;
              <kbd className="px-1 py-0.5 rounded border">M</kbd> markieren,&nbsp;
              <kbd className="px-1 py-0.5 rounded border">U</kbd> nächste&nbsp;
              {filterMode === "flagged" ? "markierte" : filterMode === "wrong" ? "falsche" : "offene"}
            </div>
          </div>
        </aside>
      </div>

      {/* ------- „In Decks speichern“ Modal ------- */}
      {saveOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="In Decks speichern"
          className="fixed inset-0 z-[70] bg-black/60 grid place-items-center p-4"
          onClick={() => setSaveOpen(false)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-hidden rounded-lg border bg-white dark:bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold">In Decks speichern</h2>
              <Button variant="outline" size="sm" onClick={() => setSaveOpen(false)}>Schließen</Button>
            </div>

            <div className="p-4 space-y-3">
              {decksLoading && <div className="text-sm text-muted-foreground">Lade Decks…</div>}
              {decksError && <div className="text-sm text-red-600">{decksError}</div>}

              {!decksLoading && !decksError && (
                <>
                  {myDecks.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Du hast noch keine eigenen Decks.
                    </div>
                  ) : (
                    <div className="max-h-[50vh] overflow-auto border rounded">
                      <ul className="divide-y">
                        {myDecks.map(d => (
                          <li key={d.id} className="flex items-center gap-3 px-3 py-2">
                            <input
                              id={`deck-${d.id}`}
                              type="checkbox"
                              className="h-4 w-4"
                              checked={!!selectedDeckIds[d.id]}
                              onChange={() => toggleDeck(d.id)}
                            />
                            <label htmlFor={`deck-${d.id}`} className="cursor-pointer text-sm">{d.title}</label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setSaveOpen(false)}>Abbrechen</Button>
                    <Button onClick={saveToDecks} disabled={saveBusy || myDecks.length === 0}>
                      {saveBusy ? "Speichere…" : "Bestätigen"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}