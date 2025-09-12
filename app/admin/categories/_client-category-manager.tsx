"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Category {
  id: string
  name: string
  description: string | null
  color: string | null
  order: number
  createdAt: Date
  updatedAt: Date
  _count: {
    exams: number
  }
}

interface CategoryManagerProps {
  initialCategories: Category[]
}

export default function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const handleCreateCategory = async (formData: FormData) => {
    try {
      setLoading(true)
      setError(null)

      const name = formData.get("name") as string
      const description = formData.get("description") as string
      const color = formData.get("color") as string
      const order = parseInt(formData.get("order") as string) || 0

      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          description: description || null,
          color: color || null,
          order
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create category")
      }

      const { category } = await response.json()
      setCategories(prev => [...prev, { ...category, _count: { exams: 0 } }])
      setIsCreateDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCategory = async (formData: FormData) => {
    if (!editingCategory) return

    try {
      setLoading(true)
      setError(null)

      const name = formData.get("name") as string
      const description = formData.get("description") as string
      const color = formData.get("color") as string
      const order = parseInt(formData.get("order") as string) || 0

      const response = await fetch(`/api/admin/categories/${editingCategory.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          description: description || null,
          color: color || null,
          order
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update category")
      }

      const { category } = await response.json()
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...category, _count: c._count } : c))
      setEditingCategory(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Sind Sie sicher, dass Sie diese Kategorie löschen möchten?")) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete category")
      }

      setCategories(prev => prev.filter(c => c.id !== categoryId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category")
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

      {/* Header mit Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Kategorien ({categories.length})</h2>
          <p className="text-sm text-muted-foreground">
            Organisiere Prüfungen in Kategorien
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Neue Kategorie</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Kategorie erstellen</DialogTitle>
            </DialogHeader>
            <form action={handleCreateCategory} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="z.B. Medizin, Technik, Sprachen"
                />
              </div>
              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Kurze Beschreibung der Kategorie"
                />
              </div>
              <div>
                <Label htmlFor="color">Farbe (Hex)</Label>
                <Input
                  id="color"
                  name="color"
                  placeholder="#3B82F6"
                  type="color"
                />
              </div>
              <div>
                <Label htmlFor="order">Reihenfolge</Label>
                <Input
                  id="order"
                  name="order"
                  type="number"
                  defaultValue="0"
                  placeholder="0"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Erstelle..." : "Erstellen"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Abbrechen
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kategorien Liste */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map(category => (
          <Card key={category.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {category.color && (
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                  )}
                  {category.name}
                </CardTitle>
                <Badge variant="secondary">
                  {category._count.exams} Prüfungen
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {category.description && (
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCategory(category)}
                >
                  Bearbeiten
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteCategory(category.id)}
                  disabled={loading || category._count.exams > 0}
                >
                  Löschen
                </Button>
              </div>
              {category._count.exams > 0 && (
                <p className="text-xs text-muted-foreground">
                  Kann nicht gelöscht werden, da noch Prüfungen zugeordnet sind
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Noch keine Kategorien erstellt</p>
          <p className="text-sm">Erstelle deine erste Kategorie, um Prüfungen zu organisieren</p>
        </div>
      )}

      {/* Edit Dialog */}
      {editingCategory && (
        <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kategorie bearbeiten</DialogTitle>
            </DialogHeader>
            <form action={handleUpdateCategory} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  name="name"
                  required
                  defaultValue={editingCategory.name}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Beschreibung</Label>
                <Input
                  id="edit-description"
                  name="description"
                  defaultValue={editingCategory.description || ""}
                />
              </div>
              <div>
                <Label htmlFor="edit-color">Farbe (Hex)</Label>
                <Input
                  id="edit-color"
                  name="color"
                  type="color"
                  defaultValue={editingCategory.color || "#3B82F6"}
                />
              </div>
              <div>
                <Label htmlFor="edit-order">Reihenfolge</Label>
                <Input
                  id="edit-order"
                  name="order"
                  type="number"
                  defaultValue={editingCategory.order}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Speichere..." : "Speichern"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingCategory(null)}
                >
                  Abbrechen
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
