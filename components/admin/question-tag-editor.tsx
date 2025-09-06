"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import TagPicker from "./tag-picker"

interface Tag {
  id: string
  name: string
  slug: string
  isSuper: boolean
  parentId?: string
  parent?: {
    id: string
    name: string
    slug: string
  }
}

interface QuestionTagEditorProps {
  questionId: string
  onTagsChange?: (tags: Tag[]) => void
  className?: string
}

export default function QuestionTagEditor({
  questionId,
  onTagsChange,
  className = ""
}: QuestionTagEditorProps) {
  const [currentTags, setCurrentTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadQuestionTags()
  }, [questionId])

  const loadQuestionTags = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/admin/questions/${questionId}/tags`)
      if (!response.ok) {
        throw new Error("Failed to load question tags")
      }
      
      const data = await response.json()
      setCurrentTags(data.tags || [])
      setSelectedTagIds(data.tags?.map((tag: Tag) => tag.id) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tags")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/admin/questions/${questionId}/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tagIds: selectedTagIds
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save tags")
      }

      // Tags neu laden um sicherzustellen, dass wir die aktuellen Daten haben
      await loadQuestionTags()
      
      if (onTagsChange) {
        onTagsChange(currentTags)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tags")
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/admin/questions/${questionId}/tags`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tagId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to remove tag")
      }

      // Tag aus der lokalen Liste entfernen
      setCurrentTags(prev => prev.filter(tag => tag.id !== tagId))
      setSelectedTagIds(prev => prev.filter(id => id !== tagId))
      
      if (onTagsChange) {
        onTagsChange(currentTags.filter(tag => tag.id !== tagId))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove tag")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Frage Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Lade Tags...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Frage Tags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {/* Aktuelle Tags anzeigen */}
        {currentTags.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Aktuelle Tags:</div>
            <div className="flex flex-wrap gap-2">
              {currentTags.map(tag => (
                <Badge
                  key={tag.id}
                  variant={tag.isSuper ? "default" : "secondary"}
                  className="flex items-center gap-1"
                >
                  {tag.isSuper && "🏷️ "}
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="ml-1 hover:text-red-600"
                    disabled={saving}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tag-Picker */}
        <div>
          <div className="text-sm font-medium mb-2">Tags hinzufügen:</div>
          <TagPicker
            value={selectedTagIds}
            onChange={setSelectedTagIds}
            className="max-h-96 overflow-y-auto"
          />
        </div>

        {/* Speichern Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving || selectedTagIds.length === 0}
            size="sm"
          >
            {saving ? "Speichere..." : "Tags hinzufügen"}
          </Button>
          <Button
            variant="outline"
            onClick={loadQuestionTags}
            disabled={saving}
            size="sm"
          >
            Aktualisieren
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
