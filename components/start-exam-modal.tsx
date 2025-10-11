"use client"

import { useState } from "react"
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

  const handlePreview = async () => {
    if (selectedTagIds.length === 0 && selectedSuperTagIds.length === 0) {
      setError("Bitte wähle mindestens einen Tag oder Supertag aus")
      return
    }

    try {
      setPreviewLoading(true)
      setError(null)

      const params = new URLSearchParams({
        examId,
        tagIds: selectedTagIds.join(","),
        superTagIds: selectedSuperTagIds.join(","),
        requireAnd: requireAnd ? "1" : "0",
        includeCases: includeCases ? "1" : "0"
      })

      const response = await fetch(`/api/questions/search?${params}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to preview questions")
      }

      const data = await response.json()
      setPreview({
        total: data.total,
        available: data.total
      })
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

      // Debug-Log
      console.log("Frontend Debug - Sending:", {
        examId,
        tagIds: selectedTagIds,
        superTagIds: selectedSuperTagIds,
        requireAnd,
        includeCases,
        limit: typeof limit === "number" ? limit : undefined
      })

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

      // Speichere die gefilterten Fragen-IDs im SessionStorage
      if (data.filteredQuestionIds && data.filteredQuestionIds.length > 0) {
        sessionStorage.setItem(`filteredQuestions_${data.attemptId}`, JSON.stringify(data.filteredQuestionIds))
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Prüfung starten</CardTitle>
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
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}

                {/* Tag-Picker */}
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

                {/* Zusätzliche Optionen */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeCases"
                      checked={includeCases}
                      onCheckedChange={(checked) => setIncludeCases(!!checked)}
                    />
                    <Label htmlFor="includeCases" className="text-sm">
                      Fallfragen einbeziehen (alle Fragen eines Falls zusammenhalten)
                    </Label>
                  </div>
                  <div className="text-xs text-muted-foreground ml-6">
                    {includeCases 
                      ? "✓ Fallfragen werden in die Prüfung einbezogen und als zusammengehörige Gruppe behandelt"
                      : "✗ Fallfragen werden aus der Prüfung ausgeschlossen, nur Einzelfragen werden verwendet"
                    }
                  </div>

                  <div>
                    <Label htmlFor="limit" className="text-sm font-medium">
                      Maximale Anzahl Fragen (optional)
                    </Label>
                    <Input
                      id="limit"
                      type="number"
                      min="1"
                      value={limit}
                      onChange={(e) => setLimit(e.target.value ? Number(e.target.value) : "")}
                      placeholder="z.B. 50"
                      className="mt-1"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Wenn weniger Fragen verfügbar sind, werden alle verwendet
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {preview && (
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="text-sm font-medium text-blue-800">
                      Verfügbare Fragen: {preview.total}
                    </div>
                    {typeof limit === "number" && limit > 0 && (
                      <div className="text-xs text-blue-700">
                        Es werden {Math.min(limit, preview.total)} Fragen verwendet
                      </div>
                    )}
                    <div className="text-xs text-blue-700 mt-1">
                      {includeCases 
                        ? "✓ Fallfragen werden einbezogen und als Gruppe behandelt"
                        : "✗ Nur Einzelfragen werden verwendet"
                      }
                    </div>
                    <div className="text-xs text-blue-700">
                      🔀 Fragen werden gemischt für unterschiedliche Prüfungsreihenfolgen
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handlePreview}
                    disabled={previewLoading || (selectedTagIds.length === 0 && selectedSuperTagIds.length === 0)}
                    variant="outline"
                  >
                    {previewLoading ? "Lade..." : "Vorschau"}
                  </Button>
                  <Button
                    onClick={handleStart}
                    disabled={loading || (selectedTagIds.length === 0 && selectedSuperTagIds.length === 0)}
                  >
                    {loading ? "Starte..." : "Prüfung starten"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={loading || previewLoading}
                  >
                    Zurücksetzen
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Die Fragen werden zufällig gemischt, aber Fallfragen bleiben zusammen.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
