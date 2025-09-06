"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

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
  children?: Tag[]
}

interface TagPickerProps {
  value: string[]
  onChange: (tagIds: string[]) => void
  superTagIds?: string[]
  onSuperTagChange?: (superTagIds: string[]) => void
  requireAnd?: boolean
  onRequireAndChange?: (requireAnd: boolean) => void
  showLogicToggle?: boolean
  className?: string
}

export default function TagPicker({
  value = [],
  onChange,
  superTagIds = [],
  onSuperTagChange,
  requireAnd = true,
  onRequireAndChange,
  showLogicToggle = false,
  className = ""
}: TagPickerProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/tags")
      if (!response.ok) throw new Error("Failed to load tags")
      
      const data = await response.json()
      setTags(data.tags || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tags")
    } finally {
      setLoading(false)
    }
  }

  const handleTagToggle = (tagId: string) => {
    const newValue = value.includes(tagId)
      ? value.filter(id => id !== tagId)
      : [...value, tagId]
    onChange(newValue)
  }

  const handleSuperTagToggle = (superTagId: string) => {
    if (!onSuperTagChange) return
    
    const newSuperTagIds = superTagIds.includes(superTagId)
      ? superTagIds.filter(id => id !== superTagId)
      : [...superTagIds, superTagId]
    onSuperTagChange(newSuperTagIds)
  }

  const superTags = tags.filter(tag => tag.isSuper)
  const normalTags = tags.filter(tag => !tag.isSuper)

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-sm text-muted-foreground">Lade Tags...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-sm text-red-600">Fehler: {error}</div>
        <Button variant="outline" size="sm" onClick={loadTags}>
          Erneut versuchen
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Logik-Toggle */}
      {showLogicToggle && onRequireAndChange && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="requireAnd"
            checked={requireAnd}
            onCheckedChange={(checked: boolean) => onRequireAndChange(!!checked)}
          />
          <label htmlFor="requireAnd" className="text-sm font-medium">
            UND-Bedingung (alle Tags müssen erfüllt sein)
          </label>
        </div>
      )}

      {/* Supertags */}
      {superTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Supertags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {superTags.map(superTag => (
                <Badge
                  key={superTag.id}
                  variant={superTagIds.includes(superTag.id) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => handleSuperTagToggle(superTag.id)}
                >
                  {superTag.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Normale Tags gruppiert nach Supertags */}
      {superTags.map(superTag => {
        const childTags = normalTags.filter(tag => tag.parentId === superTag.id)
        if (childTags.length === 0) return null

        return (
          <Card key={superTag.id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-muted-foreground">→</span>
                {superTag.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {childTags.map(tag => (
                  <Badge
                    key={tag.id}
                    variant={value.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => handleTagToggle(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Tags ohne Parent */}
      {normalTags.filter(tag => !tag.parentId).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weitere Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {normalTags
                .filter(tag => !tag.parentId)
                .map(tag => (
                  <Badge
                    key={tag.id}
                    variant={value.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => handleTagToggle(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ausgewählte Tags anzeigen */}
      {(value.length > 0 || superTagIds.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ausgewählt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {superTagIds.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Supertags:
                </div>
                <div className="flex flex-wrap gap-1">
                  {superTagIds.map(id => {
                    const tag = tags.find(t => t.id === id)
                    return tag ? (
                      <Badge key={id} variant="secondary" className="text-xs">
                        {tag.name}
                      </Badge>
                    ) : null
                  })}
                </div>
              </div>
            )}
            {value.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Tags:
                </div>
                <div className="flex flex-wrap gap-1">
                  {value.map(id => {
                    const tag = tags.find(t => t.id === id)
                    return tag ? (
                      <Badge key={id} variant="secondary" className="text-xs">
                        {tag.name}
                      </Badge>
                    ) : null
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
