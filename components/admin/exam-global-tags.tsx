"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import TagPicker from "@/components/admin/tag-picker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"

interface Tag {
  id: string
  name: string
  slug: string
  isSuper: boolean
  parentId?: string | null
  parent?: {
    id: string
    name: string
    slug: string
  } | null
}

interface ExamGlobalTagsProps {
  examId: string
}

export default function ExamGlobalTags({ examId }: ExamGlobalTagsProps) {
  const [globalTags, setGlobalTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [selectedSuperTagIds, setSelectedSuperTagIds] = useState<string[]>([])
  const [requireAnd, setRequireAnd] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Lade globale Tags
  useEffect(() => {
    const loadGlobalTags = async () => {
      try {
        const response = await fetch(`/api/admin/exams/${examId}/global-tags`)
        if (response.ok) {
          const data = await response.json()
          setGlobalTags(data.tags)
        }
      } catch (err) {
        console.error("Error loading global tags:", err)
      }
    }

    loadGlobalTags()
  }, [examId])

  const handleAddTags = async () => {
    if (selectedTagIds.length === 0 && selectedSuperTagIds.length === 0) {
      setError("Bitte wähle mindestens einen Tag oder Supertag aus")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const response = await fetch(`/api/admin/exams/${examId}/global-tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tagIds: [...selectedTagIds, ...selectedSuperTagIds]
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add global tags")
      }

      // Lade globale Tags neu
      const reloadResponse = await fetch(`/api/admin/exams/${examId}/global-tags`)
      if (reloadResponse.ok) {
        const data = await reloadResponse.json()
        setGlobalTags(data.tags)
      }

      setSelectedTagIds([])
      setSelectedSuperTagIds([])
      setSuccess("Globale Tags erfolgreich hinzugefügt und auf alle Fragen angewendet")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add global tags")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    if (!confirm("Sind Sie sicher, dass Sie diesen globalen Tag entfernen möchten? Dies entfernt den Tag auch von allen Fragen des Examens.")) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const response = await fetch(`/api/admin/exams/${examId}/global-tags`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ tagId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to remove global tag")
      }

      // Lade globale Tags neu
      const reloadResponse = await fetch(`/api/admin/exams/${examId}/global-tags`)
      if (reloadResponse.ok) {
        const data = await reloadResponse.json()
        setGlobalTags(data.tags)
      }

      setSuccess("Globaler Tag erfolgreich entfernt")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove global tag")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Globale Tags</CardTitle>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Globale Tags werden automatisch auf alle Fragen dieses Examens angewendet. 
            Neue Fragen erhalten diese Tags automatisch.
          </AlertDescription>
        </Alert>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
            {success}
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
          showLogicToggle={false} // Logik ist hier nicht relevant
        />

        {/* Add Button */}
        <Button
          onClick={handleAddTags}
          disabled={loading || (selectedTagIds.length === 0 && selectedSuperTagIds.length === 0)}
        >
          {loading ? "Füge hinzu..." : "Tags als global hinzufügen"}
        </Button>

        {/* Aktuelle globale Tags */}
        {globalTags.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Aktuelle globale Tags:</h4>
            <div className="flex flex-wrap gap-2">
              {globalTags.map(tag => (
                <Badge
                  key={tag.id}
                  variant={tag.isSuper ? "default" : "secondary"}
                  className="flex items-center gap-1"
                >
                  {tag.isSuper ? "🏷️" : "🏷️"}
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="ml-1 text-xs hover:text-red-600"
                    disabled={loading}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {globalTags.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Noch keine globalen Tags definiert. Wähle Tags aus, um sie automatisch auf alle Fragen anzuwenden.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
