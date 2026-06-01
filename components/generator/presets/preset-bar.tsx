"use client"

import { useCallback, useEffect, useState } from "react"
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
import { Bookmark, Share2, Trash2, Loader2, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export type PresetData = {
  id: string
  title: string
  topic: string
  difficulty: number
  mode: "single" | "case"
  caseQuestionCount: number | null
  publicSlug: string | null
}

type Props = {
  /** Aktuelle Generator-Eingaben (für "Aktuelle Einstellungen speichern"). */
  current: {
    topic: string
    difficulty: number
    mode: "single" | "case"
    caseQuestionCount: number | null
  }
  /** Callback: Preset wurde geladen → Form befüllen. */
  onApply: (preset: PresetData) => void
  /** Nicht eingeloggt? Dann nur Hint, kein Speichern. */
  isLoggedIn: boolean
}

/**
 * Schmale Leiste mit gespeicherten Presets + Save-Dialog + Share-Funktion.
 * Wird über dem Generator-Form angezeigt.
 */
export function PresetBar({ current, onApply, isLoggedIn }: Props) {
  const [presets, setPresets] = useState<PresetData[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [share, setShare] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadPresets = useCallback(async () => {
    if (!isLoggedIn) {
      setLoaded(true)
      return
    }
    try {
      const res = await fetch("/api/presets", { credentials: "include" })
      if (!res.ok) {
        setLoaded(true)
        return
      }
      const data = await res.json().catch(() => ({}))
      if (data?.ok && Array.isArray(data.presets)) {
        setPresets(data.presets)
      }
    } catch {
      // ignore
    } finally {
      setLoaded(true)
    }
  }, [isLoggedIn])

  useEffect(() => {
    void loadPresets()
  }, [loadPresets])

  async function savePreset() {
    if (!current.topic.trim() || current.topic.trim().length < 3) {
      toast.error("Thema fehlt", {
        description: "Gib mindestens 3 Zeichen ein, bevor du speicherst.",
      })
      return
    }
    if (!title.trim()) {
      toast.error("Titel fehlt")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/presets", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          topic: current.topic,
          difficulty: current.difficulty,
          mode: current.mode,
          caseQuestionCount: current.caseQuestionCount,
          share,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || "Speichern fehlgeschlagen.")
        return
      }
      setPresets((p) => [data.preset, ...p])
      setSaveOpen(false)
      setTitle("")
      setShare(false)
      toast.success("Preset gespeichert.")
    } catch {
      toast.error("Netzwerkfehler.")
    } finally {
      setSaving(false)
    }
  }

  async function deletePreset(id: string) {
    if (!confirm("Preset wirklich löschen?")) return
    try {
      const res = await fetch(`/api/presets/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        toast.error("Konnte Preset nicht löschen.")
        return
      }
      setPresets((p) => p.filter((x) => x.id !== id))
    } catch {
      toast.error("Netzwerkfehler.")
    }
  }

  async function copyShareLink(p: PresetData) {
    if (!p.publicSlug) {
      toast.info("Dieses Preset ist nicht öffentlich.")
      return
    }
    const url = `${window.location.origin}/generator?preset=${encodeURIComponent(p.publicSlug)}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link kopiert.")
    } catch {
      toast.error("Konnte Link nicht kopieren.")
    }
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className="mb-4 rounded-2xl border bg-card/50 px-3 py-2 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Bookmark className="h-3.5 w-3.5" />
          Presets
        </span>

        {loaded && presets.length === 0 && (
          <span className="text-xs text-muted-foreground">
            Noch keine gespeichert.
          </span>
        )}

        <div className="-mx-1 flex flex-1 flex-nowrap gap-1 overflow-x-auto px-1 py-0.5">
          {presets.map((p) => (
            <div
              key={p.id}
              className="group inline-flex shrink-0 items-center overflow-hidden rounded-full border bg-background"
            >
              <button
                type="button"
                onClick={() => onApply(p)}
                title={`${p.topic} · Schwierigkeit ${p.difficulty} · ${p.mode === "case" ? `Fall ${p.caseQuestionCount ?? ""}` : "Einzelfrage"}`}
                className="max-w-[18ch] truncate px-3 py-1 text-xs font-medium hover:bg-muted"
              >
                {p.title}
              </button>
              {p.publicSlug && (
                <button
                  type="button"
                  onClick={() => copyShareLink(p)}
                  className="border-l px-2 py-1 text-muted-foreground hover:bg-muted"
                  aria-label="Teilen-Link kopieren"
                  title="Share-Link kopieren"
                >
                  <Copy className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => deletePreset(p.id)}
                className="border-l px-2 py-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Preset löschen"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSaveOpen(true)}
          className="ml-auto h-7 gap-1 rounded-full px-3 text-xs"
        >
          <Bookmark className="h-3.5 w-3.5" />
          Speichern
        </Button>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preset speichern</DialogTitle>
            <DialogDescription>
              Speichere die aktuellen Einstellungen unter einem Namen — optional als Share-Link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="preset-title" className="text-sm font-medium">
                Titel
              </label>
              <Input
                id="preset-title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                placeholder="z. B. Akutes Koronarsyndrom"
                disabled={saving}
                maxLength={80}
              />
            </div>

            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <p className="line-clamp-2">
                <span className="font-medium text-foreground">Thema:</span>{" "}
                {current.topic || "(leer)"}
              </p>
              <p>
                <span className="font-medium text-foreground">Schwierigkeit:</span> {current.difficulty}/5 ·{" "}
                <span className="font-medium text-foreground">Modus:</span>{" "}
                {current.mode === "case"
                  ? `Fallfrage (${current.caseQuestionCount ?? 3} Teilfragen)`
                  : "Einzelfrage"}
              </p>
            </div>

            <label
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                share ? "border-primary bg-primary/5" : "hover:bg-muted/40"
              )}
            >
              <input
                type="checkbox"
                checked={share}
                onChange={(e) => setShare(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Share2 className="h-3.5 w-3.5" />
                  Als geteiltes Preset speichern
                </span>
                <span className="block text-xs text-muted-foreground">
                  Erzeugt einen Share-Link, den du an Mit-Studierende weitergeben kannst.
                </span>
              </span>
              {share && <Check className="ml-auto h-4 w-4 text-primary" />}
            </label>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={savePreset} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Speichere…
                </>
              ) : (
                "Speichern"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
