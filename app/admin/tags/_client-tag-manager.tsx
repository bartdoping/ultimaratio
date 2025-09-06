"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  children?: Tag[]
  _count?: {
    questionLinks: number
  }
}

interface TagManagerProps {
  initialTags: Tag[]
}

export default function TagManager({ initialTags }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form für neues Tag
  const [newTag, setNewTag] = useState({
    name: "",
    slug: "",
    isSuper: false,
    parentId: ""
  })

  const superTags = tags.filter(tag => tag.isSuper)
  const normalTags = tags.filter(tag => !tag.isSuper)

  const handleCreateTag = async () => {
    if (!newTag.name || !newTag.slug) {
      setError("Name und Slug sind erforderlich")
      return
    }

    if (!newTag.isSuper && !newTag.parentId) {
      setError("Normale Tags müssen einen Supertag haben")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const response = await fetch("/api/admin/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newTag.name,
          slug: newTag.slug,
          isSuper: newTag.isSuper,
          parentId: newTag.isSuper ? null : newTag.parentId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create tag")
      }

      const data = await response.json()
      // Stelle sicher, dass _count existiert
      const tagWithCount = {
        ...data.tag,
        _count: data.tag._count || { questionLinks: 0 }
      }
      setTags(prev => [...prev, tagWithCount])
      setNewTag({ name: "", slug: "", isSuper: false, parentId: "" })
      setSuccess("Tag erfolgreich erstellt")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tag")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("Sind Sie sicher, dass Sie dieses Tag löschen möchten?")) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const response = await fetch("/api/admin/tags", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: tagId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete tag")
      }

      setTags(prev => prev.filter(tag => tag.id !== tagId))
      setSuccess("Tag erfolgreich gelöscht")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tag")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
          {success}
        </div>
      )}

      {/* Neues Tag erstellen */}
      <Card>
        <CardHeader>
          <CardTitle>Neues Tag erstellen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newTag.name}
                onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. Anatomie"
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={newTag.slug}
                onChange={(e) => setNewTag(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="z.B. anatomie"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isSuper"
              checked={newTag.isSuper}
              onCheckedChange={(checked) => setNewTag(prev => ({ ...prev, isSuper: !!checked }))}
            />
            <Label htmlFor="isSuper">Supertag</Label>
          </div>

          {!newTag.isSuper && (
            <div>
              <Label htmlFor="parentId">Supertag</Label>
              <Select
                value={newTag.parentId}
                onValueChange={(value) => setNewTag(prev => ({ ...prev, parentId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Supertag auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {superTags.map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={handleCreateTag} disabled={loading}>
            {loading ? "Erstelle..." : "Tag erstellen"}
          </Button>
        </CardContent>
      </Card>

      {/* Supertags */}
      {superTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Supertags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {superTags.map(superTag => (
                <div key={superTag.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <Badge variant="default">🏷️ {superTag.name}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {superTag._count?.questionLinks || 0} Fragen
                    </span>
                    {superTag.children && superTag.children.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {superTag.children.length} Untertags
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTag(superTag.id)}
                    disabled={loading}
                  >
                    Löschen
                  </Button>
                </div>
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
              <CardTitle className="flex items-center gap-2">
                <span className="text-muted-foreground">→</span>
                {superTag.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {childTags.map(tag => (
                  <div key={tag.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{tag.name}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {tag._count?.questionLinks || 0} Fragen
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTag(tag.id)}
                      disabled={loading}
                    >
                      Löschen
                    </Button>
                  </div>
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
            <CardTitle>Weitere Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {normalTags
                .filter(tag => !tag.parentId)
                .map(tag => (
                  <div key={tag.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{tag.name}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {tag._count?.questionLinks || 0} Fragen
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTag(tag.id)}
                      disabled={loading}
                    >
                      Löschen
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
