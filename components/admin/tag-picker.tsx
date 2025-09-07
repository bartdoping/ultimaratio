"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

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
  showSearch?: boolean
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
  showSearch = false,
  className = ""
}: TagPickerProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

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
    
    // Automatisch UND-Bedingung deaktivieren wenn nur noch ein Tag gewählt ist
    const newTotalSelectedTags = superTagIds.length + newValue.length
    if (newTotalSelectedTags <= 1 && onRequireAndChange && requireAnd) {
      console.log("TagPicker Debug - Auto-disabling AND logic (normal tag)")
      onRequireAndChange(false)
    }
  }

  const handleSuperTagToggle = (superTagId: string) => {
    if (!onSuperTagChange) return
    
    const newSuperTagIds = superTagIds.includes(superTagId)
      ? superTagIds.filter(id => id !== superTagId)
      : [...superTagIds, superTagId]
    
    console.log("TagPicker Debug - SuperTag Toggle:", { 
      superTagId, 
      oldSuperTagIds: superTagIds, 
      newSuperTagIds 
    })
    
    onSuperTagChange(newSuperTagIds)
    
    // Automatisch UND-Bedingung deaktivieren wenn nur noch ein Tag gewählt ist
    const newTotalSelectedTags = newSuperTagIds.length + value.length
    if (newTotalSelectedTags <= 1 && onRequireAndChange && requireAnd) {
      console.log("TagPicker Debug - Auto-disabling AND logic")
      onRequireAndChange(false)
    }
  }

  // Filtere Tags basierend auf Suchbegriff
  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const superTags = filteredTags.filter(tag => tag.isSuper)
  const normalTags = filteredTags.filter(tag => !tag.isSuper)
  
  // Berechne die Gesamtanzahl der ausgewählten Tags (Supertags + normale Tags)
  const totalSelectedTags = superTagIds.length + value.length
  const canUseAndLogic = totalSelectedTags > 1

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
      {/* Suchfeld */}
      {showSearch && (
        <div className="space-y-2">
          <label htmlFor="tagSearch" className="text-sm font-medium">
            Tags durchsuchen
          </label>
          <Input
            id="tagSearch"
            type="text"
            placeholder="Tag-Name eingeben..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
          {searchTerm && (
            <div className="text-xs text-muted-foreground">
              {filteredTags.length} von {tags.length} Tags gefunden
            </div>
          )}
        </div>
      )}

      {/* Logik-Toggle */}
      {showLogicToggle && onRequireAndChange && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="requireAnd"
            checked={requireAnd && canUseAndLogic}
            disabled={!canUseAndLogic}
            onCheckedChange={(checked: boolean) => {
              if (canUseAndLogic) {
                onRequireAndChange(!!checked)
              }
            }}
          />
          <label 
            htmlFor="requireAnd" 
            className={`text-sm font-medium ${!canUseAndLogic ? 'text-muted-foreground' : ''}`}
          >
            UND-Bedingung (alle Tags müssen erfüllt sein)
            {!canUseAndLogic && (
              <span className="text-xs text-muted-foreground ml-1">
                (mindestens 2 Tags erforderlich)
              </span>
            )}
          </label>
        </div>
      )}

      {/* Keine Tags gefunden */}
      {searchTerm && filteredTags.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-sm">Keine Tags gefunden für "{searchTerm}"</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchTerm("")}
            className="mt-2"
          >
            Suche zurücksetzen
          </Button>
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
