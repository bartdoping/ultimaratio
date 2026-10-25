"use client"

import { useState } from "react"
import { ChevronDown, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import { LEARN_PLANS, type LearnPlanId } from "@/lib/learn-plans"
import { schwaechsteFaecher, type FachReife, type Reife } from "@/lib/pruefungsreife"

/**
 * Prüfungsreife je Fach: Anteil beherrschter Themen am Lernplan. Die drei
 * schwächsten Fächer stehen oben, jedes mit einem Tipp direkt ins Üben.
 */
export function PruefungsreifeKarte({
  planId,
  reife,
  onUeben,
  onProbe,
}: {
  planId: LearnPlanId
  reife: Reife
  onUeben: (fach: string) => void
  onProbe: () => void
}) {
  const [alle, setAlle] = useState(false)
  const prozent = reife.gesamt.themen ? Math.round((reife.gesamt.beherrscht / reife.gesamt.themen) * 100) : 0
  const liste = alle
    ? [...reife.faecher].sort((a, b) => quote(b) - quote(a))
    : schwaechsteFaecher(reife, 3)

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Prüfungsreife {LEARN_PLANS[planId].shortLabel}</div>
          <div className="mt-0.5 text-3xl font-bold tabular-nums">{prozent} %</div>
        </div>
        <button
          type="button"
          onClick={onProbe}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-semibold text-background"
        >
          <GraduationCap className="h-4 w-4" aria-hidden /> Probeklausur
        </button>
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
        {reife.gesamt.beherrscht} von {reife.gesamt.themen} Themen sicher · {reife.gesamt.gekreuzt} angefangen
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(prozent, reife.gesamt.gekreuzt > 0 ? 1 : 0)}%` }} />
      </div>

      <div className="mt-4 text-xs font-medium text-muted-foreground">{alle ? "Alle Fächer" : "Hier holst du am meisten raus"}</div>
      <ul className="mt-2 space-y-2.5">
        {liste.map((f) => (
          <FachZeile key={f.fach} f={f} onUeben={() => onUeben(f.fach)} />
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setAlle((a) => !a)}
        aria-expanded={alle}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {alle ? "Weniger anzeigen" : `Alle ${reife.faecher.length} Fächer`}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", alle && "rotate-180")} aria-hidden />
      </button>
    </div>
  )
}

function quote(f: FachReife): number {
  return f.themen ? f.beherrscht / f.themen : 0
}

function FachZeile({ f, onUeben }: { f: FachReife; onUeben: () => void }) {
  const q = quote(f)
  return (
    <li className="flex items-center gap-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate">{f.fach}</span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {f.beherrscht}/{f.themen}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(q * 100, f.gekreuzt > 0 ? 2 : 0)}%` }} />
        </div>
      </div>
      <button type="button" onClick={onUeben} className="h-8 shrink-0 rounded-full border px-3 text-xs font-medium hover:bg-muted">
        Üben
      </button>
    </li>
  )
}
