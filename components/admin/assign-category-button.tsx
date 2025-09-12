"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface Category {
  id: string
  name: string
  color: string | null
}

interface AssignCategoryButtonProps {
  examId: string
  examTitle: string
  currentCategoryId: string | null
  categories: Category[]
  onCategoryAssigned: () => void
}

export default function AssignCategoryButton({
  examId,
  examTitle,
  currentCategoryId,
  categories,
  onCategoryAssigned
}: AssignCategoryButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAssignCategory = async (categoryId: string | null) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/exams/${examId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          categoryId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to assign category")
      }

      setOpen(false)
      onCategoryAssigned()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign category")
    } finally {
      setLoading(false)
    }
  }

  const currentCategory = categories.find(c => c.id === currentCategoryId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {currentCategory ? (
            <div className="flex items-center gap-2">
              {currentCategory.color && (
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: currentCategory.color }}
                />
              )}
              {currentCategory.name}
            </div>
          ) : (
            "Kategorie zuordnen"
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kategorie für "{examTitle}" zuordnen</DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-2">Kategorie auswählen:</h4>
            <div className="space-y-2">
              <Button
                variant={currentCategoryId === null ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => handleAssignCategory(null)}
                disabled={loading}
              >
                Keine Kategorie
              </Button>
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={currentCategoryId === category.id ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => handleAssignCategory(category.id)}
                  disabled={loading}
                >
                  <div className="flex items-center gap-2">
                    {category.color && (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                    )}
                    {category.name}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
