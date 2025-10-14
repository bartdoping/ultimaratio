"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ChatMsg = { role: "user" | "assistant"; content: string }
type AnswerStyle = "concise" | "detailed"

export default function AssistantSidebar(props: {
  context: any
  onClose?: () => void
  compact?: boolean
}) {
  const { context, onClose, compact } = props

  // --- UI state ---
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Stil (Kurz/Ausführlich) – persistiert in localStorage
  const [style, setStyle] = useState<AnswerStyle>(() => {
    if (typeof window === "undefined") return "concise"
    const v = window.localStorage.getItem("ai:answerStyle")
    return v === "detailed" ? "detailed" : "concise"
  })
  useEffect(() => {
    try { localStorage.setItem("ai:answerStyle", style) } catch {}
  }, [style])

  // Chat-Verlauf (pro Frage neu)
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Hi! Ich bin dein KI-Tutor. Frag mich alles zur aktuellen Frage – ich gebe Denkanstöße, Erklärungen und Merkhilfen. (Keine Spoiler, solange du noch nicht geantwortet hast.)\n\nTipp: Rechts oben kannst du zwischen \"Kurz\" und \"Ausführlich\" wählen.",
    },
  ])

  // Bei neuem Kontext (z. B. Wechsel der Frage) Verlauf zurücksetzen
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
  }, [messages, busy])

  // ——— Senden ———
  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content) return

    setInput("")
    setError(null)
    setBusy(true)

    const userMsg: ChatMsg = { role: "user", content }
    setMessages((prev) => [...prev, userMsg])

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          context,
          answerStyle: style,
        }),
      })

      const j = await res.json().catch(() => null)

      if (!res.ok || !j) {
        throw new Error("Fehler bei der KI-Antwort (Netzwerk/Server).")
      }

      if (j.ok && typeof j.text === "string" && j.text.trim().length > 0) {
        setMessages((prev) => [...prev, { role: "assistant", content: String(j.text).trim() }])
      } else {
        // Server hat ok:false oder leeren Text zurückgegeben → nutzerfreundliche Fallbacks
        const fallback =
          style === "concise"
            ? "Konnte gerade keine knappe Antwort erzeugen. Bitte erneut senden."
            : "Konnte gerade keine ausführliche Antwort erzeugen. Bitte erneut senden."
        setMessages((prev) => [...prev, { role: "assistant", content: fallback }])
        if (j?.error) setError(j.error)
      }
    } catch (err) {
      console.error("AI Chat error:", err)
      const msg = (err as Error).message || "Unerwarteter Fehler."
      setError(msg)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Uups, da ging etwas schief. Bitte nochmal senden." },
      ])
    } finally {
      setBusy(false)
    }
  }

  // Quick-Ask Funktion
  function quickAsk(prompt: string) {
    setInput(prompt)
    void send(prompt)
  }

  // Copy Funktion
  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  // Spoiler-Schutz: Nur wenn bereits geantwortet wurde
  const spoilerOn = !context?.answered

  // Thinking Animation
  function ThinkingDots() {
    return (
      <span className="inline-flex gap-1">
        <span className="animate-bounce [animation-delay:-0.3s]">.</span>
        <span className="animate-bounce [animation-delay:-0.15s]">.</span>
        <span className="animate-bounce">.</span>
      </span>
    )
  }

  return (
    <div className="h-full flex flex-col border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-3 pr-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Stil-Schalter - nur auf größeren Bildschirmen */}
          <div className="hidden sm:flex items-center gap-1">
            <Button
              variant={style === "concise" ? "default" : "outline"}
              size="sm"
              onClick={() => setStyle("concise")}
              className="h-7 px-2 text-xs"
            >
              Kurz
            </Button>
            <Button
              variant={style === "detailed" ? "default" : "outline"}
              size="sm"
              onClick={() => setStyle("detailed")}
              className="h-7 px-2 text-xs"
            >
              Ausführlich
            </Button>
          </div>
          
          {/* Reset Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setMessages([{ role: "assistant", content: "Chat zurückgesetzt. Wie kann ich helfen?" }])
              setError(null)
            }}
            title="Chat zurücksetzen"
            className="hidden sm:flex"
          >
            Reset
          </Button>
          
          {/* Close Button - nur auf Mobile */}
          {onClose && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              title="KI-Tutor schließen"
              className="sm:hidden"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 pr-2 space-y-3">
        {/* Kontext-Hinweis */}
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

      {/* Input – prominenter, an Compact-Mode angepasst (weiter nach oben) */}
      <form
        className="px-3 pt-3 pb-2 border-t flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-background/95"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <Input
          placeholder={compact ? "Frage eingeben…" : "Frag den Tutor … (Enter zum Senden)"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          className={cn("flex-1 min-w-0 h-12 sm:h-12 text-[16px]", compact ? "text-[15px]" : "text-[16px]")}
        />
        <Button type="submit" disabled={busy || !input.trim()} className="w-full sm:w-auto h-12 px-5">
          {busy ? "Senden…" : "Senden"}
        </Button>
      </form>

      {/* Quick-Prompts – unter das Eingabefeld verschoben, kompakter */}
      <div className="px-3 pb-3 pt-1 flex flex-wrap gap-2 border-t bg-muted/30">
        <button
          className="text-xs px-2 py-1 rounded bg-white dark:bg-background border hover:bg-accent flex-1 min-w-0"
          onClick={() => quickAsk("Gib mir bitte einen Hinweis, wie ich vorgehe – ohne die Lösung zu verraten.")}
        >
          <span className="truncate">Hinweis</span>
        </button>
        <button
          className="text-xs px-2 py-1 rounded bg-white dark:bg-background border hover:bg-accent flex-1 min-w-0"
          onClick={() => quickAsk("Erkläre das Ausschlussverfahren für diese Optionen.")}
        >
          <span className="truncate">Ausschluss</span>
        </button>
        <button
          className="text-xs px-2 py-1 rounded bg-white dark:bg-background border hover:bg-accent flex-1 min-w-0"
          onClick={() => quickAsk("Gib mir eine kurze Merkhilfe zu dieser Frage.")}
        >
          <span className="truncate">Merkhilfe</span>
        </button>
      </div>
    </div>
  )
}
