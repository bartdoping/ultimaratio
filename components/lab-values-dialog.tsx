"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"

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

export function LabValuesDialog({ open, onClose }: Props) {
  const [labLoading, setLabLoading] = useState(false)
  const [labError, setLabError] = useState<string | null>(null)
  const [labValues, setLabValues] = useState<LabValue[]>([])
  const [labQuery, setLabQuery] = useState("")

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

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open || labValues.length > 0 || labLoading) return
    setLabLoading(true)
    setLabError(null)
    ;(async () => {
      try {
        const res = await fetch("/api/labs")
        const raw = await res.json().catch(() => null)
        const arr = (Array.isArray(raw) ? raw : raw?.items || raw?.labs || raw?.data || []) as Record<
          string,
          unknown
        >[]
        setLabValues(
          arr.map((lv, i) => ({
            id: String(lv.id ?? i),
            name: String(lv.name ?? ""),
            unit: String(lv.unit ?? ""),
            refRange: String(lv.refRange ?? lv.ref_range ?? ""),
            category: String(lv.category ?? ""),
          }))
        )
      } catch {
        setLabError("Laborwerte konnten nicht geladen werden.")
      } finally {
        setLabLoading(false)
      }
    })()
  }, [open, labValues.length, labLoading])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Laborwerte"
      className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-lg border bg-white dark:bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold">Laborwerte</h2>
          <div className="flex items-center gap-2">
            <input
              className="input h-9 w-full sm:w-64"
              placeholder="Suchen (Name, Kategorie, Einheit)…"
              value={labQuery}
              onChange={(e) => setLabQuery(e.target.value)}
              autoFocus
            />
            <Button variant="outline" onClick={onClose}>
              Schließen
            </Button>
          </div>
        </div>

        <div className="p-0">
          {labLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Lade Laborwerte…</p>
          ) : labError ? (
            <p className="p-4 text-sm text-red-600">{labError}</p>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-secondary">
                  <tr className="text-left">
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Einheit</th>
                    <th className="px-4 py-2 font-medium">Referenz</th>
                    <th className="px-4 py-2 font-medium">Kategorie</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLabs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                        Keine Treffer.
                      </td>
                    </tr>
                  ) : (
                    filteredLabs.map((lv) => (
                      <tr key={lv.id} className="odd:bg-muted/40">
                        <td className="px-4 py-2">{lv.name}</td>
                        <td className="px-4 py-2">{lv.unit}</td>
                        <td className="px-4 py-2">{lv.refRange}</td>
                        <td className="px-4 py-2">{lv.category}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          Tipp: <kbd className="px-1 py-0.5 rounded border">L</kbd> öffnen,&nbsp;
          <kbd className="px-1 py-0.5 rounded border">Esc</kbd> schließen.
        </div>
      </div>
    </div>
  )
}
