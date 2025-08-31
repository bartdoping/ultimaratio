// components/ai/assistant-widget.tsx
"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type ChatMsg = { role: "user" | "assistant"; content: string }
type AnswerStyle = "concise" | "detailed"

export default function AssistantWidget(props: {
  context: any
  initialOpen?: boolean
  fabLabel?: string
}) {
  const { context, initialOpen = false, fabLabel = "Tutor" } = props

  // --- UI state ---
  const [open, setOpen] = useState(initialOpen)
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [style, setStyle] = useState<AnswerStyle>(() => {
    if (typeof window === "undefined") return "concise"
    return (localStorage.getItem("ai:answerStyle") as AnswerStyle) || "concise"
  })
  useEffect(() => {
    try { localStorage.setItem("ai:answerStyle", style) } catch {}
  }, [style])

  // Chat-Verlauf (pro Frage)
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Hi! Ich bin dein KI-Tutor. Frag mich alles zur aktuellen Frage – ich gebe Denkanstöße, Erklärungen und Merkhilfen. (Keine Spoiler, solange du noch nicht geantwortet hast.)\n\nTipp: Oben rechts kannst du zwischen „Kurz“ und „Ausführlich“ wechseln.",
    },
  ])

  // Bei neuem Kontext (z. B. Frage gewechselt) Verlauf zurücksetzen
  const questionId = String(context?.questionId || "")
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "Neue Frage erkannt. Wobei kann ich helfen? Ich erkläre gern Schritt für Schritt – ohne die Lösung zu spoilern.",
      },
    ])
    setError(null)
    setInput("")
  }, [questionId])

  // Scroll an das Ende bei neuem Content
  const endRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, busy, open])

  // ——— Thinking-Indicator ———
  const ThinkingDots = () => (
    <div className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
    </div>
  )

  // ——— Copy-to-clipboard ———
  function copy(text: string) {
    try { navigator.clipboard?.writeText(text) } catch {}
  }

  // Badge für Spoiler-Guard
  const spoilerOn = !(context?.canRevealCorrect === true)

  // ——— Senden (robust, ohne Seed-Assistant im Payload) ———
  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || busy) return
    setError(null)
    setBusy(true)

    // UI-Chat aktualisieren
    const nextMsgs = [...messages, { role: "user" as const, content }]
    setMessages(nextMsgs)
    setInput("")

    // 1) Seed-/Reset-Assistentenblasen NICHT ans Backend schicken
    const payloadMessages = nextMsgs.filter((m, idx) => {
      if (m.role !== "assistant") return true
      // Erste Begrüßung (index 0) ausfiltern
      if (idx === 0) return false
      // Reset- oder „Neue Frage“-System-ähnliche Blasen ausfiltern
      const t = m.content.trim().toLowerCase()
      if (t.startsWith("chat zurückgesetzt")) return false
      if (t.startsWith("neue frage erkannt")) return false
      return true
    })

    // 2) Verlauf begrenzen (optional, reduziert Prompt-Rauschen)
    const MAX_TURNS = 8
    const trimmedPayload =
      payloadMessages.length > MAX_TURNS
        ? payloadMessages.slice(-MAX_TURNS)
        : payloadMessages

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          messages: trimmedPayload,
          answerStyle: style, // "concise" | "detailed" (Server wählt Model & Prompt)
        }),
      })
      const j = await res.json().catch(() => null)

      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || "Fehler bei der KI-Antwort.")
      }

      let text = String(j.text || "").trim()
      if (!text) {
        text = style === "concise"
          ? "Konnte gerade keine knappe Antwort erzeugen. Bitte erneut senden."
          : "Konnte gerade keine ausführliche Antwort erzeugen. Bitte erneut senden."
      }

      setMessages((m) => [...m, { role: "assistant", content: text }])
    } catch (e) {
      setError((e as Error).message || "Unerwarteter Fehler.")
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Uups, da ging etwas schief. Bitte nochmal senden." },
      ])
    } finally {
      setBusy(false)
    }
  }

  // ——— Quick-Prompts ———
  function quickAsk(s: string) { void send(s) }

  return (
    <>
      {/* FAB */}
      <button
        aria-label="KI-Tutor öffnen"
        className={cn(
          "fixed z-[70] bottom-5 right-5 h-12 w-12 rounded-full shadow-lg",
          "bg-gradient-to-br from-blue-600 to-indigo-600 text-white",
          "grid place-items-center hover:brightness-110 transition"
        )}
        onClick={() => setOpen(true)}
        title={fabLabel}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M9 7a3 3 0 1 1 6 0v1h2a2 2 0 0 1 2 2v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V10a2 2 0 0 1 2-2h2V7zM8 10H7v5a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-5h-1v1a1 1 0 1 1-2 0v-1H10v1a1 1 0 1 1-2 0v-1z" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-[69] bg-black/30 lg:bg-transparent" onClick={() => setOpen(false)} />}

      {/* Panel */}
      <div
        className={cn(
          "fixed z-[71] bottom-20 right-4 sm:bottom-6 sm:right-6",
          "w-[92vw] max-w-[420px] h-[70vh] sm:h-[65vh]",
          "rounded-xl border bg-background shadow-xl",
          "flex flex-col overflow-hidden",
          open ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2",
          "transition-all"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="KI-Tutor"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M9 7a3 3 0 1 1 6 0v1h2a2 2 0 0 1 2 2v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V10a2 2 0 0 1 2-2h2V7z" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="font-semibold">KI-Tutor</div>
              <div className="text-xs text-muted-foreground">
                {spoilerOn ? (
                  <span className="inline-flex items-center gap-1">
                    <Badge variant="secondary" className="h-4 text-[10px]">Spoiler-Schutz</Badge>
                    {busy ? <span className="inline-flex items-center gap-1"><ThinkingDots /> denkt…</span> : "bereit"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Badge variant="default" className="h-4 text-[10px]">Antworten erlaubt</Badge>
                    {busy ? <span className="inline-flex items-center gap-1"><ThinkingDots /> denkt…</span> : "bereit"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stil-Schalter */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 rounded bg-muted p-0.5 border">
              <button
                className={cn(
                  "px-2 py-1 text-xs rounded",
                  style === "concise" ? "bg-background border" : "opacity-70 hover:opacity-100"
                )}
                onClick={() => setStyle("concise")}
                disabled={busy}
                title="Kurze, prägnante Antwort"
              >
                Kurz
              </button>
              <button
                className={cn(
                  "px-2 py-1 text-xs rounded",
                  style === "detailed" ? "bg-background border" : "opacity-70 hover:opacity-100"
                )}
                onClick={() => setStyle("detailed")}
                disabled={busy}
                title="Ausführliche, schrittweise Erklärung"
              >
                Ausführlich
              </button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setMessages([{ role: "assistant", content: "Chat zurückgesetzt. Wie kann ich helfen?" }])
                setError(null)
              }}
              title="Chat zurücksetzen"
            >
              Reset
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} title="Schließen">
              ✕
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Kontexthinweis */}
          {context?.stem && (
            <div className="text-xs text-muted-foreground border rounded p-2 bg-muted/30">
              <div className="font-medium">Aktuelle Frage</div>
              <div className="line-clamp-3">{context.stem}</div>
            </div>
          )}

          {messages.map((m, i) => {
            const mine = m.role === "user"
            return (
              <div key={i} className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
                {!mine && (
                  <div className="h-7 w-7 flex-none rounded bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M9 7a3 3 0 1 1 6 0v1h2a2 2 0 0 1 2 2v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V10a2 2 0 0 1 2-2h2V7z" />
                    </svg>
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                    mine
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  {m.content}
                  {!mine && (
                    <div className="mt-2 -mb-1 flex justify-end">
                      <button
                        className="text-[11px] text-muted-foreground hover:underline"
                        onClick={() => copy(m.content)}
                        title="Antwort kopieren"
                      >
                        Kopieren
                      </button>
                    </div>
                  )}
                </div>
                {mine && <div className="h-7 w-7 flex-none rounded-full bg-blue-100 dark:bg-blue-900/30" />}
              </div>
            )
          })}

          {/* Thinking bubble */}
          {busy && (
            <div className="flex gap-2 justify-start">
              <div className="h-7 w-7 flex-none rounded bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M9 7a3 3 0 1 1 6 0v1h2a 2 2 0 0 1 2 2v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V10a2 2 0 0 1 2-2h2V7z" />
                </svg>
              </div>
              <div className="max-w-[80%] rounded-2xl px-3 py-2 text-sm bg-muted text-foreground rounded-bl-sm">
                <div className="flex items-center gap-2">
                  <ThinkingDots />
                  <span className="text-xs text-muted-foreground">formuliert Antwort…</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600 border border-red-300 bg-red-50 dark:bg-red-950/20 rounded p-2">
              {error}
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Quick-Prompts */}
        <div className="px-3 pb-2 flex flex-wrap gap-2 border-t bg-muted/40">
          <button
            className="text-xs px-2 py-1 rounded bg-white dark:bg-background border hover:bg-accent"
            onClick={() => quickAsk("Gib mir bitte einen Hinweis, wie ich vorgehe – ohne die Lösung zu verraten.")}
          >
            Hinweis
          </button>
          <button
            className="text-xs px-2 py-1 rounded bg-white dark:bg-background border hover:bg-accent"
            onClick={() => quickAsk("Erkläre das Ausschlussverfahren für diese Optionen.")}
          >
            Ausschlussverfahren
          </button>
          <button
            className="text-xs px-2 py-1 rounded bg-white dark:bg-background border hover:bg-accent"
            onClick={() => quickAsk("Gib mir eine kurze Merkhilfe zu dieser Frage.")}
          >
            Merkhilfe
          </button>
        </div>

        {/* Input */}
        <form
          className="p-2 border-t flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <Input
            placeholder="Frag den Tutor …"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            className="flex-1"
          />
          <Button type="submit" disabled={busy || !input.trim()}>
            {busy ? "Senden…" : "Senden"}
          </Button>
        </form>
      </div>
    </>
  )
}