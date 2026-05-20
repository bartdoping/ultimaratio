"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import TagPicker from "@/components/admin/tag-picker"

interface StartExamModalProps {
  examId: string
  onStart?: (attemptId: string) => void
  className?: string
}

export default function StartExamModal({
  examId,
  onStart,
  className = ""
}: StartExamModalProps) {
  const [open, setOpen] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [selectedSuperTagIds, setSelectedSuperTagIds] = useState<string[]>([])
  const [requireAnd, setRequireAnd] = useState(true)
  const [includeCases, setIncludeCases] = useState(true)
  const [limit, setLimit] = useState<number | "">("")
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    total: number
    available: number
  } | null>(null)

  useEffect(() => {
    setPreview(null)
  }, [selectedTagIds, selectedSuperTagIds, requireAnd, includeCases, limit])

  const effectivePreviewCount = useMemo(() => {
    if (!preview) return null
    if (typeof limit === "number" && limit > 0) return Math.min(limit, preview.total)
    return preview.total
  }, [limit, preview])

  const fetchPreview = async () => {
    const params = new URLSearchParams({
      examId,
      tagIds: selectedTagIds.join(","),
      superTagIds: selectedSuperTagIds.join(","),
      requireAnd: requireAnd ? "1" : "0",
      includeCases: includeCases ? "1" : "0",
    })

    const response = await fetch(`/api/questions/search?${params}`)
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to preview questions")
    }

    const data = await response.json()
    const nextPreview = {
      total: data.total,
      available: data.total,
    }
    setPreview(nextPreview)
    return nextPreview
  }

  const handlePreview = async () => {
    try {
      setPreviewLoading(true)
      setError(null)
      await fetchPreview()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview questions")
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleStart = async () => {
    // Erlaube Start ohne Tag-Auswahl (zufällige Fragen)
    // if (selectedTagIds.length === 0 && selectedSuperTagIds.length === 0) {
    //   setError("Bitte wähle mindestens einen Tag oder Supertag aus")
    //   return
    // }

    try {
      setLoading(true)
      setError(null)

      const effectivePreview = preview ?? await fetchPreview()
      if (effectivePreview.total === 0) {
        setError("Für diese Auswahl wurden keine Fragen gefunden. Bitte Filter anpassen.")
        return
      }

      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          examId,
          tagIds: selectedTagIds,
          superTagIds: selectedSuperTagIds,
          requireAnd,
          includeCases,
          limit: typeof limit === "number" ? limit : undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to start exam")
      }

      const data = await response.json()
      if (!data.attemptId) {
        throw new Error("No attempt ID returned")
      }

      setOpen(false)
      if (onStart) {
        onStart(data.attemptId)
      } else {
        window.location.href = `/exam-run/${data.attemptId}`
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start exam")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSelectedTagIds([])
    setSelectedSuperTagIds([])
    setRequireAnd(true)
    setIncludeCases(true)
    setLimit("")
    setError(null)
    setPreview(null)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className={className}>
        Prüfung starten
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start konfigurieren</div>
                    <CardTitle className="mt-1">Prüfung starten</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(false)}
                  >
                    Schließen
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                    {error}
                  </div>
                )}

                {/* Tag-Picker */}
                <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                  <div>
                    <div className="text-sm font-semibold">
                      Themen eingrenzen
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Optional. Ohne Auswahl werden alle verfügbaren Fragen gemischt.
                    </div>
                  </div>
                  <TagPicker
                    value={selectedTagIds}
                    onChange={setSelectedTagIds}
                    superTagIds={selectedSuperTagIds}
                    onSuperTagChange={setSelectedSuperTagIds}
                    requireAnd={requireAnd}
                    onRequireAndChange={setRequireAnd}
                    showLogicToggle={true}
                    showSearch={true}
                    examId={examId}
                  />
                </div>

                {/* Zusätzliche Optionen */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="includeCases"
                        checked={includeCases}
                        onCheckedChange={(checked) => setIncludeCases(!!checked)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="includeCases" className="text-sm font-medium">
                          Fallfragen einbeziehen
                        </Label>
                        <div className="text-xs text-muted-foreground">
                          {includeCases
                            ? "Fallfragen bleiben als zusammengehörige Gruppe erhalten."
                            : "Es werden nur Einzelfragen verwendet."}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-4">
                    <Label htmlFor="limit" className="text-sm font-medium">
                      Anzahl begrenzen
                    </Label>
                    <Input
                      id="limit"
                      type="number"
                      min="1"
                      value={limit}
                      onChange={(e) => setLimit(e.target.value ? Number(e.target.value) : "")}
                      placeholder="z. B. 50"
                      className="mt-1"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Leer lassen, um alle passenden Fragen zu nutzen.
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {preview && (
                  <div className={`rounded-xl border p-4 ${preview.total === 0 ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20" : "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20"}`}>
                    <div className={`text-sm font-medium ${preview.total === 0 ? "text-amber-800 dark:text-amber-300" : "text-blue-800 dark:text-blue-300"}`}>
                      Verfügbare Fragen: {preview.total}
                    </div>
                    {preview.total === 0 && (
                      <div className="text-xs text-amber-700 dark:text-amber-300">
                        Mit dieser Auswahl kann keine Prüfung gestartet werden. Passe Tags oder Fallfragen-Optionen an.
                      </div>
                    )}
                    {selectedTagIds.length === 0 && selectedSuperTagIds.length === 0 && (
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        Alle verfügbaren Fragen werden verwendet.
                      </div>
                    )}
                    {selectedTagIds.length > 0 && selectedSuperTagIds.length > 0 && (
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        Fragen werden nach ausgewählten Tags gefiltert.
                      </div>
                    )}
                    {typeof limit === "number" && limit > 0 && (
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        Es werden {effectivePreviewCount ?? 0} Fragen verwendet.
                        {limit > preview.total && preview.total > 0 ? " Das Limit ist höher als die Trefferzahl." : ""}
                      </div>
                    )}
                    <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      {includeCases
                        ? "Fallfragen werden einbezogen und als Gruppe behandelt."
                        : "Nur Einzelfragen werden verwendet."}
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      Die Reihenfolge wird beim Start gemischt.
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    onClick={handlePreview}
                    disabled={previewLoading}
                    variant="outline"
                  >
                    {previewLoading ? "Prüfe..." : "Fragen prüfen"}
                  </Button>
                  <Button
                    onClick={handleStart}
                    disabled={loading || preview?.total === 0}
                  >
                    {loading ? "Starte..." : "Prüfung starten"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleReset}
                    disabled={loading || previewLoading}
                  >
                    Zurücksetzen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
