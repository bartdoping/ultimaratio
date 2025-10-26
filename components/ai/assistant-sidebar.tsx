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
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-background px-3 py-3">
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
          {/* Stil-Schalter */}
          <div className="flex items-center gap-1">
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

      {/* Body - Kompakter Chat-Bereich */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {/* Kontext-Hinweis */}
        {context?.stem && (
          <div className="text-xs text-muted-foreground border rounded p-2 bg-muted/30">
            <div className="font-medium">Aktuelle Frage</div>
            <div className="line-clamp-2 leading-relaxed">{context.stem}</div>
          </div>
        )}

        {messages.map((m, i) => {
          const mine = m.role === "user"
          return (
            <div key={i} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className="flex items-start gap-2 max-w-[85%]">
                {/* Avatar */}
                {!mine && (
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                    AI
                  </div>
                )}
                
                {/* Message Bubble */}
                <div
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed",
                    mine 
                      ? "bg-blue-500 text-white" 
                      : "bg-muted border"
                  )}
                >
                  {m.content}
                </div>
                
                {/* User Avatar */}
                {mine && (
                  <div className="h-5 w-5 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                    U
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Thinking bubble */}
        {busy && (
          <div className="rounded-md border bg-muted px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <ThinkingDots />
              <span className="text-xs text-muted-foreground">formuliert Antwort…</span>
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

      {/* Quick-Prompts oberhalb des Textfeldes */}
      <div className="px-3 py-2 border-t bg-muted/30">
        <div className="flex gap-2">
          <button
            className="text-xs px-2 py-1.5 rounded-md bg-white dark:bg-background border hover:bg-accent hover:shadow-sm transition-all flex items-center gap-1.5 flex-1 min-w-0"
            onClick={() => quickAsk("Gib mir bitte einen Hinweis, wie ich vorgehe – ohne die Lösung zu verraten.")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <span className="truncate">Hinweis</span>
          </button>
          <button
            className="text-xs px-2 py-1.5 rounded-md bg-white dark:bg-background border hover:bg-accent hover:shadow-sm transition-all flex items-center gap-1.5 flex-1 min-w-0"
            onClick={() => quickAsk("Erkläre das Ausschlussverfahren für diese Optionen.")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
            <span className="truncate">Ausschluss</span>
          </button>
          <button
            className="text-xs px-2 py-1.5 rounded-md bg-white dark:bg-background border hover:bg-accent hover:shadow-sm transition-all flex items-center gap-1.5 flex-1 min-w-0"
            onClick={() => quickAsk("Gib mir eine kurze Merkhilfe zu dieser Frage.")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2.5-9H19V1h-2v1H7V1H5v1H4.5C3.67 2 3 2.67 3 3.5v15c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5v-15c0-.83-.67-1.5-1.5-1.5z"/>
            </svg>
            <span className="truncate">Merkhilfe</span>
          </button>
        </div>
      </div>

      {/* Eingabe prominent am unteren Rand */}
      <form
        className="px-3 py-3 border-t bg-background flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <Input
          placeholder="Frag den Tutor … (Enter zum Senden)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          className={cn("flex-1 min-w-0 h-12 text-sm")}
          autoFocus
        />
        <Button type="submit" disabled={busy || !input.trim()} className="h-12 px-4">
          {busy ? "..." : "Senden"}
        </Button>
      </form>
    </div>
  )
}
