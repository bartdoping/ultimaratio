"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import TagPicker from "@/components/admin/tag-picker"

interface BulkAddByTagsProps {
  deckId: string
  onSuccess?: (added: number, total: number, alreadyExists: number) => void
  className?: string
}

export default function BulkAddByTags({
  deckId,
  onSuccess,
  className = ""
}: BulkAddByTagsProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [selectedSuperTagIds, setSelectedSuperTagIds] = useState<string[]>([])
  const [requireAnd, setRequireAnd] = useState(true)
  const [includeCases, setIncludeCases] = useState(true)
  const [examId, setExamId] = useState("")
  const [limit, setLimit] = useState<number | "">("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    added: number
    total: number
    alreadyExists: number
  } | null>(null)

  const handleSubmit = async () => {
    if (selectedTagIds.length === 0 && selectedSuperTagIds.length === 0) {
      setError("Bitte wähle mindestens einen Tag oder Supertag aus")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const response = await fetch(`/api/decks/${deckId}/bulk-add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tagIds: selectedTagIds,
          superTagIds: selectedSuperTagIds,
          requireAnd,
          includeCases,
          examId: examId || undefined,
          limit: typeof limit === "number" ? limit : undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add questions")
      }

      const data = await response.json()
      setResult(data)
      
      if (onSuccess) {
        onSuccess(data.added, data.total, data.alreadyExists)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add questions")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSelectedTagIds([])
    setSelectedSuperTagIds([])
    setRequireAnd(true)
    setIncludeCases(true)
    setExamId("")
    setLimit("")
    setError(null)
    setResult(null)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Fragen nach Tags hinzufügen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {result && (
          <div className="text-sm bg-green-50 p-2 rounded">
            <div className="font-medium text-green-800">Erfolgreich hinzugefügt!</div>
            <div className="text-green-700">
              {result.added} neue Fragen hinzugefügt
              {result.alreadyExists > 0 && `, ${result.alreadyExists} bereits vorhanden`}
              {result.total > 0 && ` (${result.total} insgesamt gefunden)`}
            </div>
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
        />

        {/* Zusätzliche Optionen */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeCases"
              checked={includeCases}
              onCheckedChange={(checked: boolean) => setIncludeCases(!!checked)}
            />
            <Label htmlFor="includeCases" className="text-sm">
              Fälle zusammenhalten (alle Fragen eines Falls hinzufügen)
            </Label>
          </div>

          <div>
            <Label htmlFor="examId" className="text-sm font-medium">
              Prüfung (optional)
            </Label>
            <Input
              id="examId"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              placeholder="Prüfungs-ID eingeben"
              className="mt-1"
            />
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
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={loading || (selectedTagIds.length === 0 && selectedSuperTagIds.length === 0)}
          >
            {loading ? "Füge hinzu..." : "Fragen hinzufügen"}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={loading}
          >
            Zurücksetzen
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
