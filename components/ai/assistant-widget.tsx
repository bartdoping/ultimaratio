// components/ai/assistant-widget.tsx
"use client"

import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils" // falls ihr keine cn-Funktion habt: einfach `className`-Strings direkt zusammenbauen

type ChatMsg = { role: "user" | "assistant"; content: string }

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

  // Chat-Verlauf (pro Frage)
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Hi! Ich bin dein KI-Tutor. Frag mich alles zur aktuellen Frage – ich gebe Denkanstöße, Erklärungen und Merkhilfen. (Keine Spoiler, solange du noch nicht geantwortet hast.)",
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

  // ——— Senden ———
  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || busy) return
    setError(null)
    setBusy(true)

    const nextMsgs = [...messages, { role: "user" as const, content }]
    setMessages(nextMsgs)
    setInput("")

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, messages: nextMsgs }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || "Fehler bei der KI-Antwort.")
      }
      const text = String(j.text || "").trim()
      setMessages((m) => [...m, { role: "assistant", content: text || "…" }])
    } catch (e) {
      setError((e as Error).message || "Unerwarteter Fehler.")
      // Füge eine kurze „Fehler“-Antwort ein, damit der Verlauf konsistent bleibt
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Uups, da ging etwas schief. Bitte nochmal senden." },
      ])
    } finally {
      setBusy(false)
    }
  }

  // ——— Quick-Prompts (fügen Text ein & senden sofort) ———
  function quickAsk(s: string) {
    void send(s)
  }

  // ——— Thinking-Indicator (Header + Bubble) ———
  const ThinkingDots = () => (
    <div className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
    </div>
  )

  // ——— Copy-to-clipboard ———
  function copy(text: string) {
    try {
      navigator.clipboard?.writeText(text)
    } catch {}
  }

  // Badge für Spoiler-Guard
  const spoilerOn = !(context?.canRevealCorrect === true)

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
      >
        {/* kleines Bot-Icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M9 7a3 3 0 1 1 6 0v1h2a2 2 0 0 1 2 2v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V10a2 2 0 0 1 2-2h2V7zM8 10H7v5a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-5h-1v1a1 1 0 1 1-2 0v-1H10v1a1 1 0 1 1-2 0v-1z" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[69] bg-black/30 lg:bg-transparent"
          onClick={() => setOpen(false)}
        />
      )}

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
                <path d="M9 7a3 3 0 1 1 6 0v1h2a2 2 0 0 1 2 2v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V10a2 2 0 0 1 2-2h2V7zM8 10H7v5a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-5h-1v1a1 1 0 1 1-2 0v-1H10v1a1 1 0 1 1-2 0v-1z" />
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

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setMessages([
                  { role: "assistant", content: "Chat zurückgesetzt. Wie kann ich helfen?" },
                ])
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
                  <path d="M9 7a3 3 0 1 1 6 0v1h2a2 2 0 0 1 2 2v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V10a2 2 0 0 1 2-2h2V7z" />
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