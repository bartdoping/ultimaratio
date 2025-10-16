"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// import { Textarea } from "@/components/ui/textarea"

interface QuestionEditorProps {
  question: {
    id: string
    stem: string
    explanation?: string | null
    tip?: string | null
    hasImmediateFeedbackAllowed: boolean
  }
  examId: string
  onUpdate: () => void
}

export default function QuestionEditor({ question, examId, onUpdate }: QuestionEditorProps) {
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
  }, [question])

  const handleSaveStem = async () => {
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
        onUpdate()
      }
    } catch (error) {
      console.error('Error saving stem:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveMeta = async () => {
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
        onUpdate()
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
      <div className="space-y-2">
        <Label>Fragestellung (Stem)</Label>
        <textarea
          value={stem}
          onChange={(e) => setStem(e.target.value)}
          className="w-full min-h-[100px] p-3 border border-input rounded-md bg-background text-sm"
          placeholder="Fragestellung eingeben..."
        />
        <Button 
          onClick={handleSaveStem}
          disabled={saving}
          size="sm"
          variant="outline"
        >
          {saving ? "Speichere..." : "Fragestellung speichern"}
        </Button>
      </div>

      {/* Meta-Daten bearbeiten */}
      <div className="space-y-2">
        <Label>Erklärung</Label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          className="w-full min-h-[80px] p-3 border border-input rounded-md bg-background text-sm"
          placeholder="Erklärung zur Frage..."
        />
      </div>

      <div className="space-y-2">
        <Label>Tipp</Label>
        <textarea
          value={tip}
          onChange={(e) => setTip(e.target.value)}
          className="w-full min-h-[60px] p-3 border border-input rounded-md bg-background text-sm"
          placeholder="Tipp oder Kommentar..."
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="allowImmediate"
          checked={allowImmediate}
          onChange={(e) => setAllowImmediate(e.target.checked)}
        />
        <Label htmlFor="allowImmediate">Sofort-Feedback für diese Frage erlauben</Label>
      </div>

      <Button 
        onClick={handleSaveMeta}
        disabled={saving}
        size="sm"
        variant="outline"
      >
        {saving ? "Speichere..." : "Meta-Daten speichern"}
      </Button>
    </div>
  )
}
