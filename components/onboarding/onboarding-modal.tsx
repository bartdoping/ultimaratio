"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Sparkles, ArrowRight, Check } from "lucide-react"

const EXAM_OPTIONS: Array<{ value: string; label: string; hint?: string }> = [
  { value: "Physikum", label: "M1 / Physikum", hint: "Vorklinik" },
  { value: "M2", label: "M2", hint: "1. Klinischer Abschnitt" },
  { value: "Hammerexamen", label: "M3 / Hammerexamen", hint: "Staatsexamen" },
  { value: "Z1", label: "Z1 (Zahnmedizin)", hint: "Vorklinik" },
  { value: "Z2", label: "Z2 (Zahnmedizin)", hint: "Klinik" },
  { value: "Z3", label: "Z3 (Zahnmedizin)", hint: "Examen" },
  { value: "Klinik", label: "Klinikalltag / Famulatur", hint: "Praxis" },
  { value: "Andere", label: "Andere", hint: "Frei wählen" },
]

const SEMESTER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const

type Props = {
  /** Wenn der User noch kein Onboarding gemacht hat, automatisch öffnen. */
  autoOpen?: boolean
}

/**
 * 60-Sekunden-Onboarding-Wizard. Wird automatisch nach Registrierung
 * gezeigt, kann übersprungen werden.
 */
export function OnboardingModal({ autoOpen = false }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [examTarget, setExamTarget] = useState<string | null>(null)
  const [semester, setSemester] = useState<number | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!autoOpen) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/onboarding", { credentials: "include" })
        if (!res.ok) return
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!data?.completed) {
          setOpen(true)
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [autoOpen])

  async function submit(skip: boolean) {
    setPending(true)
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          examTarget,
          semester,
          skip,
        }),
      })
    } catch {
      // ignore – Best-effort
    } finally {
      setPending(false)
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Willkommen! Kurze Einrichtung.
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Worauf bereitest du dich vor? (60 Sekunden — kannst du jederzeit ändern.)"
              : "In welchem Semester bist du?"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="grid grid-cols-2 gap-2">
            {EXAM_OPTIONS.map((opt) => {
              const active = examTarget === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setExamTarget(opt.value)}
                  className={cn(
                    "rounded-xl border bg-card px-3 py-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{opt.label}</span>
                    {active && (
                      <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                    )}
                  </div>
                  {opt.hint && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{opt.hint}</p>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-1.5">
              {SEMESTER_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSemester(n)}
                  className={cn(
                    "rounded-md border px-2 py-2 text-sm font-medium tabular-nums transition-colors",
                    semester === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Optional. Du kannst Onboarding auch überspringen.
            </p>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => submit(true)}
            disabled={pending}
          >
            Überspringen
          </Button>
          {step === 1 ? (
            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={!examTarget || pending}
            >
              Weiter <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => submit(false)}
              disabled={pending}
            >
              {pending ? "Speichere…" : "Fertig — starten"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
