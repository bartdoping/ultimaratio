"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import CompactTagManager from "@/components/admin/compact-tag-manager"

interface QuestionFormProps {
  question: {
    id: string
    stem: string
    explanation?: string | null
    tip?: string | null
    hasImmediateFeedbackAllowed: boolean
  }
  examId: string
}

export default function QuestionForm({ question, examId }: QuestionFormProps) {
  const [stem, setStem] = useState(question.stem)
  const [explanation, setExplanation] = useState(question.explanation || "")
  const [tip, setTip] = useState(question.tip || "")
  const [allowImmediate, setAllowImmediate] = useState(question.hasImmediateFeedbackAllowed)
  const [saving, setSaving] = useState(false)

  // Aktualisiere lokale State wenn sich die Frage ändert
  useEffect(() => {
    setStem(question.stem)
    setExplanation(question.explanation || "")
    setTip(question.tip || "")
    setAllowImmediate(question.hasImmediateFeedbackAllowed)
  }, [question.id, question.stem, question.explanation, question.tip, question.hasImmediateFeedbackAllowed])

  const handleSaveStem = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const formData = new FormData()
      formData.append('examId', examId)
      formData.append('qid', question.id)
      formData.append('stem', stem)

      const response = await fetch('/api/admin/exams/update-question-stem', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        // Erfolgreich gespeichert
        console.log('Stem saved successfully')
      }
    } catch (error) {
      console.error('Error saving stem:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const formData = new FormData()
      formData.append('examId', examId)
      formData.append('qid', question.id)
      formData.append('explanation', explanation)
      formData.append('tip', tip)
      formData.append('allowImmediate', allowImmediate ? 'on' : '')

      const response = await fetch('/api/admin/exams/update-question-meta', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        // Erfolgreich gespeichert
        console.log('Meta saved successfully')
      }
    } catch (error) {
      console.error('Error saving meta:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Stem bearbeiten */}
      <form onSubmit={handleSaveStem} className="grid gap-2">
        <Label>Fragestellung (Stem)</Label>
        <textarea 
          value={stem}
          onChange={(e) => setStem(e.target.value)}
          className="w-full min-h-[100px] p-3 border border-input rounded-md bg-background text-sm"
          required 
        />
        <div>
          <Button type="submit" variant="outline" disabled={saving}>
            {saving ? "Speichere..." : "Fragestellung speichern"}
          </Button>
        </div>
      </form>

      {/* Meta-Daten bearbeiten */}
      <form onSubmit={handleSaveMeta} className="grid gap-2">
        <div className="space-y-2">
          <Label>Erklärung</Label>
          <textarea 
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="w-full min-h-[80px] p-3 border border-input rounded-md bg-background text-sm"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Tipp</Label>
          <textarea 
            value={tip}
            onChange={(e) => setTip(e.target.value)}
            className="w-full min-h-[60px] p-3 border border-input rounded-md bg-background text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={allowImmediate}
            onChange={(e) => setAllowImmediate(e.target.checked)}
          />
          <Label>Sofort-Feedback für diese Frage erlauben</Label>
        </div>
        
        <div>
          <Button type="submit" variant="outline" disabled={saving}>
            {saving ? "Speichere..." : "Meta-Daten speichern"}
          </Button>
        </div>
      </form>

      {/* Tag-Management */}
      <div className="mt-6">
        <CompactTagManager 
          questionId={question.id}
          onTagChange={() => {
            // Optional: Reload question tags if needed
            console.log('Tags updated')
          }} 
        />
      </div>
    </div>
  )
}
