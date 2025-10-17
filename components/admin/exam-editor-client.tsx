"use client"

import { useState } from "react"
import QuestionShelf from "@/components/admin/question-shelf"
import QuestionEditorWrapper from "@/components/admin/question-editor-wrapper"

interface ExamEditorClientProps {
  examId: string
  editingQuestion?: {
    id: string
    stem: string
    explanation?: string | null
    tip?: string | null
    hasImmediateFeedbackAllowed: boolean
  }
}

export default function ExamEditorClient({ examId, editingQuestion }: ExamEditorClientProps) {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleQuestionUpdate = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Fragen-Regal */}
      <div className="lg:col-span-1">
        <QuestionShelf key={refreshKey} examId={examId} />
      </div>

      {/* Frage-Editor */}
      {editingQuestion && (
        <div className="lg:col-span-2">
          <QuestionEditorWrapper 
            question={editingQuestion}
            examId={examId}
            onQuestionUpdate={handleQuestionUpdate}
          />
        </div>
      )}
    </div>
  )
}
