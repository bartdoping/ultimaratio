"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { KreuzenItem, KreuzenNextResponse, KreuzenSource } from "@/lib/kreuzen-types"

/**
 * Fragenpuffer des Kreuz-Modus.
 *
 * Hält immer ein paar fertige Fragen vorrätig. "Weiter" zeigt sofort die
 * nächste; nachgeladen wird im Hintergrund, solange man liest. Wartezeit
 * sieht man nur bei der allerersten Frage zu einem Thema, das noch niemand
 * gekreuzt hat.
 *
 * Offline-fähig: Der Puffer liegt zusätzlich im Browserspeicher (bis 20
 * Fragen), Antworten gehen in einen Ausgangskorb und werden nachgereicht,
 * sobald wieder Netz da ist. Ein Funkloch im Bus unterbricht nichts.
 */

const ZIEL = 4
const NIEDRIG = 2
const MAX_GESPEICHERT = 20
const OUTBOX_KEY = "fragenkreuzen:outbox"
const GESEHEN_KEY = "fragenkreuzen:gesehen"

export type PendingAnswer = {
  poolQuestionId: string | null
  savedId: string | null
  chosenText: string
  ms: number
}

function sourceKey(source: KreuzenSource, difficulty: number): string {
  const s =
    source.type === "topic" ? `t:${source.topic.toLowerCase().trim()}`
    : source.type === "plan" ? `p:${source.planId}:${source.day}`
    : source.type
  return `fragenkreuzen:buffer:${s}:${difficulty}`
}

function lesen<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function schreiben(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Speicher voll oder gesperrt — der Puffer funktioniert auch ohne.
  }
}

/** Antworten nachreichen. Bleibt ein Eintrag hängen, wird er beim nächsten Mal erneut versucht. */
async function outboxLeeren(): Promise<void> {
  const korb = lesen<PendingAnswer[]>(OUTBOX_KEY, [])
  if (korb.length === 0 || (typeof navigator !== "undefined" && !navigator.onLine)) return
  const rest: PendingAnswer[] = []
  for (const a of korb) {
    try {
      const res = await fetch("/api/kreuzen/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(a),
      })
      // 4xx: Frage unbekannt o. Ä. — nicht ewig wiederholen.
      if (res.status >= 500) rest.push(a)
      else if (res.ok) {
        const d = await res.json().catch(() => null)
        if (d?.streak) window.dispatchEvent(new CustomEvent("fragenkreuzen:streak-updated", { detail: d.streak }))
      }
    } catch {
      rest.push(a)
    }
  }
  schreiben(OUTBOX_KEY, rest)
}

export function useQuestionBuffer(opts: {
  source: KreuzenSource | null
  difficulty: number
  /** Angemeldet — nur dann werden fällige Wiederholungen eingemischt. */
  loggedIn: boolean
}) {
  const { source, difficulty, loggedIn } = opts
  const [queue, setQueue] = useState<KreuzenItem[]>([])
  const [current, setCurrent] = useState<KreuzenItem | null>(null)
  const [laedt, setLaedt] = useState(false)
  const [grenze, setGrenze] = useState<Extract<KreuzenNextResponse, { ok: true }>["grenze"]>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [quota, setQuota] = useState<Extract<KreuzenNextResponse, { ok: true }>["quota"] | null>(null)

  const inflight = useRef(0)
  const geholt = useRef(0) // wie viele Plätze insgesamt angefragt wurden
  const gesehen = useRef<Set<string>>(new Set())
  const queueRef = useRef<KreuzenItem[]>([])
  const erschoepft = useRef(false)
  queueRef.current = queue

  const key = source ? sourceKey(source, difficulty) : null

  // Gesehene Poolfragen merken (auch anonym), damit nichts doppelt kommt.
  useEffect(() => {
    gesehen.current = new Set(lesen<string[]>(GESEHEN_KEY, []))
  }, [])

  const merkeGesehen = useCallback((k: string) => {
    gesehen.current.add(k)
    schreiben(GESEHEN_KEY, [...gesehen.current].slice(-400))
  }, [])

  const nachladen = useCallback(async () => {
    if (!source || erschoepft.current) return
    if (typeof navigator !== "undefined" && !navigator.onLine) return
    if (inflight.current >= 2) return
    const fehlend = ZIEL - queueRef.current.length - inflight.current
    if (fehlend <= 0) return

    const count = Math.min(3, fehlend)
    // Jeder 4. Platz ist eine fällige Wiederholung (falls vorhanden).
    let dueSlots = 0
    if (loggedIn && source.type !== "due") {
      for (let i = geholt.current; i < geholt.current + count; i++) if ((i + 1) % 4 === 0) dueSlots++
    }
    geholt.current += count
    inflight.current++
    setLaedt(true)
    try {
      const exclude = [...gesehen.current, ...queueRef.current.map((q) => q.key)]
      const res = await fetch("/api/kreuzen/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ source, difficulty, count, dueSlots, exclude }),
      })
      const data = (await res.json()) as KreuzenNextResponse
      if (!data.ok) {
        setFehler("Fragen konnten nicht geladen werden.")
        return
      }
      setQuota(data.quota)
      setFehler(null)
      const neu = data.items.filter((it) => !gesehen.current.has(it.key))
      if (neu.length > 0) {
        setQueue((q) => {
          const keys = new Set(q.map((x) => x.key))
          return [...q, ...neu.filter((x) => !keys.has(x.key))]
        })
      }
      if (data.grenze) {
        setGrenze(data.grenze)
        // Bei echten Grenzen nicht weiter anfragen — sonst Endlosschleife.
        if (data.grenze !== "generierung_fehlgeschlagen" && neu.length === 0) erschoepft.current = true
      }
    } catch {
      setFehler("Keine Verbindung — es geht weiter, sobald Netz da ist.")
    } finally {
      inflight.current--
      setLaedt(inflight.current > 0)
    }
  }, [source, difficulty, loggedIn])

  // Neue Quelle: gespeicherten Puffer laden, sonst neu beginnen.
  useEffect(() => {
    erschoepft.current = false
    geholt.current = 0
    setGrenze(null)
    setFehler(null)
    if (!key) {
      setQueue([])
      setCurrent(null)
      return
    }
    const gespeichert = lesen<KreuzenItem[]>(key, []).filter((x) => !gesehen.current.has(x.key))
    setCurrent(gespeichert[0] ?? null)
    setQueue(gespeichert.slice(1))
  }, [key])

  // Puffer im Browser sichern (Offline-Vorrat).
  useEffect(() => {
    if (!key) return
    schreiben(key, [...(current ? [current] : []), ...queue].slice(0, MAX_GESPEICHERT))
  }, [key, current, queue])

  // Auffüllen, wann immer der Vorrat sinkt.
  useEffect(() => {
    if (!source) return
    if (queue.length < NIEDRIG + (current ? 0 : 1)) void nachladen()
  }, [source, queue.length, current, nachladen])

  // Erste Frage setzen, sobald etwas da ist.
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0])
      setQueue((q) => q.slice(1))
    }
  }, [current, queue])

  // Netzstatus + Ausgangskorb.
  useEffect(() => {
    const update = () => {
      setOffline(!navigator.onLine)
      if (navigator.onLine) {
        void outboxLeeren()
        void nachladen()
      }
    }
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [nachladen])

  /** Antwort vermerken — sofort lokal, Server bei Gelegenheit. */
  const antworten = useCallback(
    (item: KreuzenItem, chosenText: string, ms: number) => {
      merkeGesehen(item.key)
      const korb = lesen<PendingAnswer[]>(OUTBOX_KEY, [])
      korb.push({ poolQuestionId: item.poolQuestionId, savedId: item.savedId, chosenText, ms })
      schreiben(OUTBOX_KEY, korb.slice(-200))
      void outboxLeeren()
    },
    [merkeGesehen]
  )

  /** Zur nächsten Frage. Gibt false zurück, wenn (noch) keine da ist. */
  const weiter = useCallback((): boolean => {
    if (current) merkeGesehen(current.key)
    const naechste = queueRef.current[0] ?? null
    setCurrent(naechste)
    setQueue((q) => q.slice(1))
    return !!naechste
  }, [current, merkeGesehen])

  /** Nach Änderung der Grenzen (z. B. Pro abgeschlossen) erneut versuchen. */
  const erneut = useCallback(() => {
    erschoepft.current = false
    setGrenze(null)
    void nachladen()
  }, [nachladen])

  return { current, vorrat: queue.length, laedt, grenze, fehler, offline, quota, antworten, weiter, erneut }
}
