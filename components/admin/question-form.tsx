"use client"

import { useState, useEffect, useRef } from "react"
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
  onQuestionUpdate?: () => void
}

export default function QuestionForm({ question, examId, onQuestionUpdate }: QuestionFormProps) {
  const [stem, setStem] = useState(question.stem)
  const [explanation, setExplanation] = useState(question.explanation || "")
  const [tip, setTip] = useState(question.tip || "")
  const [allowImmediate, setAllowImmediate] = useState(question.hasImmediateFeedbackAllowed)
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const stemDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const metaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Aktualisiere lokale State wenn sich die Frage ändert
  useEffect(() => {
    setStem(question.stem)
    setExplanation(question.explanation || "")
    setTip(question.tip || "")
    setAllowImmediate(question.hasImmediateFeedbackAllowed)
  }, [question.id, question.stem, question.explanation, question.tip, question.hasImmediateFeedbackAllowed])

  const saveStem = async () => {
    setAutoSaving(true)
    try {
      const formData = new FormData()
      formData.append('examId', examId)
      formData.append('qid', question.id)
      formData.append('stem', stem)

      await fetch('/api/admin/exams/update-question-stem', {
        method: 'POST',
        body: formData,
      })
    } catch (error) {
      console.error('Error saving stem:', error)
    } finally {
      setAutoSaving(false)
    }
  }

  const handleSaveStem = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await saveStem()
    } finally {
      setSaving(false)
    }
  }

  const saveMeta = async () => {
    setAutoSaving(true)
    try {
      const formData = new FormData()
      formData.append('examId', examId)
      formData.append('qid', question.id)
      formData.append('explanation', explanation)
      formData.append('tip', tip)
      formData.append('allowImmediate', allowImmediate ? 'on' : '')

      await fetch('/api/admin/exams/update-question-meta', {
        method: 'POST',
        body: formData,
      })
    } catch (error) {
      console.error('Error saving meta:', error)
    } finally {
      setAutoSaving(false)
    }
  }

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await saveMeta()
    } finally {
      setSaving(false)
    }
  }

  // Debounced Autosave (600ms) – optional, ohne Buttons zu entfernen
  useEffect(() => {
    if (stemDebounceRef.current) clearTimeout(stemDebounceRef.current)
    stemDebounceRef.current = setTimeout(() => {
      // Nur speichern, wenn sich der Stem vom ursprünglichen unterscheidet
      if (question.stem !== stem) {
        saveStem()
      }
    }, 600)
    return () => {
      if (stemDebounceRef.current) clearTimeout(stemDebounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stem, question.id])

  useEffect(() => {
    if (metaDebounceRef.current) clearTimeout(metaDebounceRef.current)
    metaDebounceRef.current = setTimeout(() => {
      if (
        question.explanation !== (explanation || "") ||
        question.tip !== (tip || "") ||
        question.hasImmediateFeedbackAllowed !== allowImmediate
      ) {
        saveMeta()
      }
    }, 600)
    return () => {
      if (metaDebounceRef.current) clearTimeout(metaDebounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explanation, tip, allowImmediate, question.id])

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
        <div className="flex items-center gap-3">
          <Button type="submit" variant="outline" disabled={saving}>
            {saving ? "Speichere..." : "Fragestellung speichern"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {autoSaving ? "Autosave..." : "Gespeichert"}
          </span>
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
        
        <div className="flex items-center gap-3">
          <Button type="submit" variant="outline" disabled={saving}>
            {saving ? "Speichere..." : "Meta-Daten speichern"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {autoSaving ? "Autosave..." : "Gespeichert"}
          </span>
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
          onQuestionTagsUpdate={() => {
            onQuestionUpdate?.()
          }}
        />
      </div>
    </div>
  )
}
