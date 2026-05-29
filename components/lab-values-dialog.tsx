"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export type LabValue = {
  id: string
  name: string
  unit: string
  refRange: string
  category: string
}

type Props = {
  open: boolean
  onClose: () => void
}

type FetchState = "idle" | "loading" | "loaded" | "error"

export function LabValuesDialog({ open, onClose }: Props) {
  const [fetchState, setFetchState] = useState<FetchState>("idle")
  const [labValues, setLabValues] = useState<LabValue[]>([])
  const [labQuery, setLabQuery] = useState("")
  const abortRef = useRef<AbortController | null>(null)
  const hasFetchedRef = useRef(false)

  const filteredLabs = useMemo(() => {
    const t = labQuery.trim().toLowerCase()
    if (!t) return labValues
    return labValues.filter(
      (lv) =>
        lv.name.toLowerCase().includes(t) ||
        lv.category.toLowerCase().includes(t) ||
        lv.unit.toLowerCase().includes(t)
    )
  }, [labValues, labQuery])

  const grouped = useMemo(() => {
    const map = new Map<string, LabValue[]>()
    for (const lv of filteredLabs) {
      const cat = lv.category || "Sonstige"
      const list = map.get(cat) ?? []
      list.push(lv)
      map.set(cat, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "de"))
  }, [filteredLabs])

  useEffect(() => {
    if (!open || hasFetchedRef.current) return
    hasFetchedRef.current = true
    setFetchState("loading")

    const controller = new AbortController()
    abortRef.current = controller
    ;(async () => {
      try {
        const res = await fetch("/api/labs", { signal: controller.signal })
        const raw = await res.json().catch(() => null)
        const arr = (Array.isArray(raw) ? raw : raw?.items || raw?.labs || raw?.data || []) as Record<
          string,
          unknown
        >[]
        const normalized = arr.map((lv, i) => ({
          id: String(lv.id ?? `${lv.name ?? "lv"}-${i}`),
          name: String(lv.name ?? ""),
          unit: String(lv.unit ?? ""),
          refRange: String(lv.refRange ?? lv.ref_range ?? ""),
          category: String(lv.category ?? ""),
        }))
        setLabValues(normalized)
        setFetchState("loaded")
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setFetchState("error")
      }
    })()

    return () => {
      controller.abort()
      abortRef.current = null
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="flex h-[92vh] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:h-[85vh] sm:w-[calc(100%-2rem)] sm:max-w-3xl"
        showCloseButton
      >
        <DialogHeader className="space-y-3 border-b px-5 py-4 text-left">
          <DialogTitle className="text-lg">Laborwerte</DialogTitle>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Suchen (Name, Kategorie, Einheit)…"
              value={labQuery}
              onChange={(e) => setLabQuery(e.target.value)}
              className="pl-9"
              aria-label="Laborwerte durchsuchen"
            />
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto">
          {fetchState === "loading" || fetchState === "idle" ? (
            <div className="space-y-2 p-5">
              <div className="h-5 w-2/5 animate-pulse rounded bg-muted" />
              <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-5 w-2/5 animate-pulse rounded bg-muted" />
            </div>
          ) : fetchState === "error" ? (
            <div className="p-5 text-sm text-red-600">
              Laborwerte konnten nicht geladen werden.
              <button
                type="button"
                onClick={() => {
                  hasFetchedRef.current = false
                  setFetchState("idle")
                }}
                className="ml-2 underline hover:no-underline"
              >
                Erneut versuchen
              </button>
            </div>
          ) : filteredLabs.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              {labValues.length === 0
                ? "Keine Laborwerte verfügbar."
                : "Keine Treffer für deine Suche."}
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-secondary/95 backdrop-blur">
                <tr className="text-left">
                  <th className="px-5 py-2.5 font-medium">Parameter</th>
                  <th className="px-5 py-2.5 font-medium">Einheit</th>
                  <th className="px-5 py-2.5 font-medium">Referenzbereich</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(([category, list]) => (
                  <LabGroup key={category} category={category} items={list} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-5 py-2 text-xs text-muted-foreground">
          <span>
            {fetchState === "loaded" ? `${filteredLabs.length} Ergebnis${filteredLabs.length === 1 ? "" : "se"}` : ""}
          </span>
          <span>
            <kbd className="rounded border bg-background px-1 py-0.5">L</kbd> öffnen ·{" "}
            <kbd className="rounded border bg-background px-1 py-0.5">Esc</kbd> schließen
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LabGroup({ category, items }: { category: string; items: LabValue[] }) {
  return (
    <>
      <tr className="bg-muted/40">
        <td
          colSpan={3}
          className="px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {category}
        </td>
      </tr>
      {items.map((lv) => (
        <tr key={lv.id} className="border-t hover:bg-muted/30">
          <td className="px-5 py-2 font-medium">{lv.name}</td>
          <td className="px-5 py-2 text-muted-foreground">{lv.unit}</td>
          <td className="px-5 py-2 tabular-nums">{lv.refRange}</td>
        </tr>
      ))}
    </>
  )
}
