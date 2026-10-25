"use client"

import { useEffect, useState } from "react"
import { iosOhneInstallation, pushAktiv, pushAktivieren, pushDeaktivieren, pushVerfuegbar } from "@/lib/push-client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const ZIELE = [10, 20, 30, 50, 100] as const

/**
 * Tagesziel und Lern-Erinnerungen. Erinnerungen sind aus, bis man sie
 * ausdrücklich einschaltet (Einwilligung), und jede Mail enthält einen
 * Abmeldelink.
 */
export function LearningSettings({ initialOptIn, initialGoal }: { initialOptIn: boolean; initialGoal: number }) {
  const [optIn, setOptIn] = useState(initialOptIn)
  const [goal, setGoal] = useState(initialGoal)
  const [saving, setSaving] = useState(false)
  // Push-Status gilt je Gerät und ist nur im Browser bekannt.
  const [push, setPush] = useState<{ moeglich: boolean; ios: boolean; an: boolean } | null>(null)

  useEffect(() => {
    void (async () => {
      setPush({ moeglich: pushVerfuegbar(), ios: iosOhneInstallation(), an: await pushAktiv() })
    })()
  }, [])

  async function pushUmschalten(an: boolean) {
    setSaving(true)
    try {
      if (an) {
        const r = await pushAktivieren()
        if (r === "an") {
          setPush((p) => (p ? { ...p, an: true } : p))
          setOptIn(true)
          toast.success("Benachrichtigungen auf diesem Gerät sind an.")
        } else if (r === "abgelehnt") {
          toast.error("Benachrichtigungen sind im Browser blockiert.", { description: "In den Website-Einstellungen erlauben." })
        } else {
          toast.error("Auf diesem Gerät nicht möglich.")
        }
      } else {
        await pushDeaktivieren()
        setPush((p) => (p ? { ...p, an: false } : p))
        toast.success("Benachrichtigungen auf diesem Gerät sind aus.")
      }
    } finally {
      setSaving(false)
    }
  }

  async function speichern(patch: { optIn?: boolean; dailyGoal?: number }) {
    setSaving(true)
    try {
      const res = await fetch("/api/account/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.ok) throw new Error()
      setOptIn(d.optIn)
      setGoal(d.dailyGoal)
      toast.success("Gespeichert")
    } catch {
      toast.error("Konnte nicht speichern.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Lernen</h2>
        <p className="text-sm text-muted-foreground">Dein Tagesziel im Kreuz-Modus und optionale Erinnerungen.</p>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">Tagesziel</div>
        <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Tagesziel">
          {ZIELE.map((z) => (
            <button
              key={z}
              type="button"
              role="radio"
              aria-checked={goal === z}
              disabled={saving}
              onClick={() => speichern({ dailyGoal: z })}
              className={cn(
                "h-10 rounded-lg text-sm font-medium tabular-nums",
                goal === z ? "bg-foreground text-background" : "bg-muted/60 hover:bg-muted"
              )}
            >
              {z}
            </button>
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/25 p-3">
        <input
          type="checkbox"
          checked={optIn}
          disabled={saving}
          onChange={(e) => speichern({ optIn: e.target.checked })}
          className="mt-1 h-4 w-4"
        />
        <span className="text-sm">
          <span className="font-medium">Lern-Erinnerung</span>
          <span className="block text-muted-foreground">
            Höchstens eine am Abend — nur wenn dein Streak reißen würde oder Wiederholungen fällig sind. Kommt als
            Benachrichtigung, wenn du sie unten erlaubst, sonst per Mail. Jederzeit abbestellbar.
          </span>
        </span>
      </label>

      {push?.moeglich && !push.ios && (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/25 p-3">
          <input
            type="checkbox"
            checked={push.an}
            disabled={saving}
            onChange={(e) => pushUmschalten(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span className="text-sm">
            <span className="font-medium">Als Benachrichtigung auf diesem Gerät</span>
            <span className="block text-muted-foreground">Statt der Mail kommt die Erinnerung direkt aufs Handy bzw. den Rechner.</span>
          </span>
        </label>
      )}
      {push?.ios && (
        <p className="text-xs text-muted-foreground">
          Erinnerungen als Benachrichtigung aufs iPhone: fragenkreuzen über „Teilen → Zum Home-Bildschirm“ hinzufügen und von
          dort öffnen.
        </p>
      )}
    </section>
  )
}
