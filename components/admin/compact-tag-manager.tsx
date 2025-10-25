"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit2, Trash2, Plus, Save, X } from "lucide-react"

interface Tag {
  id: string
  name: string
  slug: string
  isSuper: boolean
  parentId?: string | null
  _count?: { questionLinks: number }
}

interface CompactTagManagerProps {
  questionId?: string
  onTagChange?: () => void
  onQuestionTagsUpdate?: () => void
}

export default function CompactTagManager({ questionId, onTagChange, onQuestionTagsUpdate }: CompactTagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [questionTags, setQuestionTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Form für neues Tag
  const [newTag, setNewTag] = useState({
    name: "",
    slug: "",
    isSuper: false,
    parentId: ""
  })

  // Form für Tag-Bearbeitung
  const [editTag, setEditTag] = useState({
    id: "",
    name: "",
    slug: "",
    isSuper: false,
    parentId: ""
  })

  const superTags = tags.filter(tag => tag.isSuper)
  const normalTags = tags.filter(tag => !tag.isSuper)

  useEffect(() => {
    loadTags()
  }, [])

  useEffect(() => {
    loadQuestionTags()
  }, [questionId])

  const loadTags = async () => {
    try {
      const response = await fetch("/api/admin/tags")
      if (response.ok) {
        const data = await response.json()
        setTags(data.tags || [])
      }
    } catch (err) {
      console.error("Error loading tags:", err)
    }
  }

  const loadQuestionTags = async () => {
    if (!questionId) {
      setQuestionTags([])
      return
    }
    
    try {
      const res = await fetch(`/api/admin/question-tags?questionId=${questionId}`, { cache: "no-store" })
      const data = await res.json()
      if (res.ok) {
        setQuestionTags(data.tags || [])
      }
    } catch (err) {
      console.error("Error loading question tags:", err)
      setQuestionTags([])
    }
  }

  const assignTagToQuestion = async (tagId: string) => {
    if (!questionId) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/question-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, tagId })
      })
      if (response.ok) {
        setSuccess('Tag zugewiesen')
        loadQuestionTags()
        onTagChange?.()
        onQuestionTagsUpdate?.()
      } else {
        const error = await response.json()
        setError(error.error || 'Fehler beim Zuweisen des Tags')
      }
    } catch (err) {
      setError('Fehler beim Zuweisen des Tags')
    } finally {
      setLoading(false)
    }
  }

  const removeTagFromQuestion = async (tagId: string) => {
    if (!questionId) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/question-tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, tagId })
      })
      if (response.ok) {
        setSuccess('Tag entfernt')
        loadQuestionTags()
        onTagChange?.()
        onQuestionTagsUpdate?.()
      } else {
        const error = await response.json()
        setError(error.error || 'Fehler beim Entfernen des Tags')
      }
    } catch (err) {
      setError('Fehler beim Entfernen des Tags')
    } finally {
      setLoading(false)
    }
  }

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
        headers: { "Content-Type": "application/json" },
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
      setTags(prev => [...prev, data.tag])
      setNewTag({ name: "", slug: "", isSuper: false, parentId: "" })
      setShowCreateForm(false)
      setSuccess("Tag erfolgreich erstellt")
      onTagChange?.()
      onQuestionTagsUpdate?.()
      window.dispatchEvent(new CustomEvent('tagUpdated'))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tag")
    } finally {
      setLoading(false)
    }
  }

  const handleEditTag = async () => {
    if (!editTag.name || !editTag.slug) {
      setError("Name und Slug sind erforderlich")
      return
    }

    if (!editTag.isSuper && !editTag.parentId) {
      setError("Normale Tags müssen einen Supertag haben")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const response = await fetch("/api/admin/tags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTag.id,
          name: editTag.name,
          slug: editTag.slug,
          isSuper: editTag.isSuper,
          parentId: editTag.isSuper ? null : editTag.parentId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update tag")
      }

      const data = await response.json()
      setTags(prev => prev.map(tag => tag.id === editTag.id ? data.tag : tag))
      setEditingTag(null)
      setSuccess("Tag erfolgreich aktualisiert")
      onTagChange?.()
      onQuestionTagsUpdate?.()
      window.dispatchEvent(new CustomEvent('tagUpdated'))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tag")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("Tag wirklich löschen?")) return

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const response = await fetch("/api/admin/tags", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tagId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete tag")
      }

      setTags(prev => prev.filter(tag => tag.id !== tagId))
      setSuccess("Tag erfolgreich gelöscht")
      onTagChange?.()
      onQuestionTagsUpdate?.()
      window.dispatchEvent(new CustomEvent('tagUpdated'))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tag")
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (tag: Tag) => {
    setEditTag({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      isSuper: tag.isSuper,
      parentId: tag.parentId || ""
    })
    setEditingTag(tag.id)
  }

  const cancelEdit = () => {
    setEditingTag(null)
    setEditTag({ id: "", name: "", slug: "", isSuper: false, parentId: "" })
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Tag-Management</CardTitle>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            size="sm"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Neues Tag
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Aktuelle Frage-Tags */}
        {questionId && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                📋 Aktuelle Frage-Tags
              </h4>
              <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                {questionTags.length} Tag{questionTags.length !== 1 ? 's' : ''}
              </span>
            </div>
            {questionTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {questionTags.map(tag => (
                  <Badge 
                    key={tag.id} 
                    variant="default" 
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer group"
                    onClick={() => removeTagFromQuestion(tag.id)}
                    title="Klicken zum Entfernen"
                  >
                    {tag.name}
                    <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">×</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                  🏷️ Keine Tags zugewiesen
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-500">
                  Füge Tags hinzu, um die Frage zu kategorisieren
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tag-Zuweisung für einzelne Fragen */}
        {questionId && (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-100">
                ➕ Tags zuweisen
              </h4>
              <span className="text-xs text-green-600 dark:text-green-400">
                Klicke auf einen Tag zum Hinzufügen
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {normalTags.map(tag => (
                <Button
                  key={tag.id}
                  size="sm"
                  variant="outline"
                  onClick={() => assignTagToQuestion(tag.id)}
                  disabled={loading}
                  className="text-xs hover:bg-green-100 dark:hover:bg-green-800 border-green-300 dark:border-green-700"
                >
                  {tag.name}
                </Button>
              ))}
            </div>
            {normalTags.length === 0 && (
              <p className="text-sm text-green-600 dark:text-green-400 text-center py-2">
                Keine Tags verfügbar. Erstelle zuerst Tags im Hauptbereich.
              </p>
            )}
          </div>
        )}

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

        {/* Neues Tag erstellen */}
        {showCreateForm && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium mb-3">Neues Tag erstellen</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="new-name">Name</Label>
                <Input
                  id="new-name"
                  value={newTag.name}
                  onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="z.B. Anatomie"
                />
              </div>
              <div>
                <Label htmlFor="new-slug">Slug</Label>
                <Input
                  id="new-slug"
                  value={newTag.slug}
                  onChange={(e) => setNewTag(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="z.B. anatomie"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-3">
              <Checkbox
                id="new-isSuper"
                checked={newTag.isSuper}
                onCheckedChange={(checked) => setNewTag(prev => ({ ...prev, isSuper: !!checked }))}
              />
              <Label htmlFor="new-isSuper">Supertag</Label>
            </div>

            {!newTag.isSuper && (
              <div className="mt-3">
                <Label htmlFor="new-parent">Supertag</Label>
                <Select value={newTag.parentId} onValueChange={(value) => setNewTag(prev => ({ ...prev, parentId: value }))}>
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

            <div className="flex gap-2 mt-3">
              <Button onClick={handleCreateTag} disabled={loading} size="sm">
                {loading ? "Erstelle..." : "Erstellen"}
              </Button>
              <Button onClick={() => setShowCreateForm(false)} variant="outline" size="sm">
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {/* Tags anzeigen */}
        <div className="space-y-3">
          <h4 className="font-medium">Supertags</h4>
          <div className="space-y-2">
            {superTags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between p-2 border rounded">
                {editingTag === tag.id ? (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input
                      value={editTag.name}
                      onChange={(e) => setEditTag(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Name"
                    />
                    <Input
                      value={editTag.slug}
                      onChange={(e) => setEditTag(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="Slug"
                    />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={editTag.isSuper}
                        onCheckedChange={(checked) => setEditTag(prev => ({ ...prev, isSuper: !!checked }))}
                      />
                      <Label className="text-sm">Supertag</Label>
                    </div>
                    <div className="flex gap-1">
                      <Button onClick={handleEditTag} size="sm" disabled={loading}>
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button onClick={cancelEdit} variant="outline" size="sm">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-blue-100 text-blue-800">
                        🏷️ {tag.name}
                      </Badge>
                      <span className="text-sm text-gray-500">({tag.slug})</span>
                      <span className="text-xs text-gray-400">
                        {tag._count?.questionLinks || 0} Fragen
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button onClick={() => startEdit(tag)} size="sm" variant="outline">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button onClick={() => handleDeleteTag(tag.id)} size="sm" variant="outline">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <h4 className="font-medium">Normale Tags</h4>
          <div className="space-y-2">
            {normalTags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between p-2 border rounded">
                {editingTag === tag.id ? (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input
                      value={editTag.name}
                      onChange={(e) => setEditTag(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Name"
                    />
                    <Input
                      value={editTag.slug}
                      onChange={(e) => setEditTag(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="Slug"
                    />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={editTag.isSuper}
                        onCheckedChange={(checked) => setEditTag(prev => ({ ...prev, isSuper: !!checked }))}
                      />
                      <Label className="text-sm">Supertag</Label>
                    </div>
                    {!editTag.isSuper && (
                      <Select value={editTag.parentId} onValueChange={(value) => setEditTag(prev => ({ ...prev, parentId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Supertag" />
                        </SelectTrigger>
                        <SelectContent>
                          {superTags.map(superTag => (
                            <SelectItem key={superTag.id} value={superTag.id}>
                              {superTag.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <div className="flex gap-1">
                      <Button onClick={handleEditTag} size="sm" disabled={loading}>
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button onClick={cancelEdit} variant="outline" size="sm">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {tag.name}
                      </Badge>
                      <span className="text-sm text-gray-500">({tag.slug})</span>
                      <span className="text-xs text-gray-400">
                        {tag._count?.questionLinks || 0} Fragen
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button onClick={() => startEdit(tag)} size="sm" variant="outline">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button onClick={() => handleDeleteTag(tag.id)} size="sm" variant="outline">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
