"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Bug, Lightbulb, Heart, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

type Category = "bug" | "idea" | "praise" | "general"

const CATEGORIES: Array<{ value: Category; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "bug", label: "Bug", icon: Bug },
  { value: "idea", label: "Idee", icon: Lightbulb },
  { value: "praise", label: "Lob", icon: Heart },
  { value: "general", label: "Anderes", icon: MessageSquare },
]

/**
 * Floating Feedback-Button rechts unten + Dialog.
 *
 * - Sichtbar global, sendet POST /api/feedback.
 * - Für eingeloggte User wird Email automatisch übernommen.
 */
export function FeedbackWidget() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category>("general")
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [showCta, setShowCta] = useState(false)

  // Den Button leicht verzögert einblenden, damit er nicht den initialen Render dominiert.
  useEffect(() => {
    const id = window.setTimeout(() => setShowCta(true), 1200)
    return () => window.clearTimeout(id)
  }, [])

  async function submit() {
    if (pending) return
    if (!message.trim() || message.trim().length < 3) {
      toast.error("Bitte schreib uns kurz, was los ist.")
      return
    }
    setPending(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          email: !session ? email.trim() || undefined : undefined,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || "Konnte Feedback nicht senden.")
        return
      }
      toast.success("Danke für dein Feedback! 💛")
      setOpen(false)
      setMessage("")
      setEmail("")
    } catch {
      toast.error("Netzwerkfehler beim Senden.")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Feedback geben"
        title="Feedback senden"
        className={cn(
          "fixed bottom-4 right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border bg-card text-foreground shadow-lg backdrop-blur transition-all hover:scale-105 hover:bg-primary hover:text-primary-foreground sm:bottom-6 sm:right-6 sm:h-12 sm:w-12",
          !showCta && "translate-y-2 opacity-0",
          showCta && "translate-y-0 opacity-100"
        )}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom),0px)" }}
      >
        <MessageSquare className="h-5 w-5" aria-hidden="true" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Feedback senden</DialogTitle>
            <DialogDescription>
              Bug, Idee, Lob oder etwas Anderes? Schreib uns — wir lesen alles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CATEGORIES.map((c) => {
                const active = c.value === category
                const Icon = c.icon
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md border bg-background px-2 py-2 text-xs font-medium transition-colors",
                      active ? "border-primary bg-primary/5 text-foreground" : "hover:bg-muted/40"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {c.label}
                  </button>
                )
              })}
            </div>

            {!session && (
              <div className="space-y-1">
                <label htmlFor="fb-email" className="text-sm font-medium">
                  Deine E-Mail (optional, für Rückfragen)
                </label>
                <Input
                  id="fb-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="du@example.de"
                  autoComplete="email"
                  disabled={pending}
                />
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="fb-message" className="text-sm font-medium">
                Nachricht
              </label>
              <Textarea
                id="fb-message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
                rows={5}
                disabled={pending}
                placeholder="Was läuft gut? Was klemmt? Was wünschst du dir?"
                maxLength={2000}
              />
              <p className="text-[10px] text-muted-foreground">
                {message.length}/2000
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Abbrechen
            </Button>
            <Button onClick={submit} disabled={pending || message.trim().length < 3}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sende…
                </>
              ) : (
                "Senden"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
