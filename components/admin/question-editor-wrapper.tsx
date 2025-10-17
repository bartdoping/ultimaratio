"use client"

import { useState } from "react"
import QuestionForm from "@/components/admin/question-form"

interface QuestionEditorWrapperProps {
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

export default function QuestionEditorWrapper({ question, examId, onQuestionUpdate }: QuestionEditorWrapperProps) {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleQuestionUpdate = () => {
    setRefreshKey(prev => prev + 1)
    onQuestionUpdate?.()
  }

  return (
    <div key={refreshKey}>
      <QuestionForm 
        question={question}
        examId={examId}
        onQuestionUpdate={handleQuestionUpdate}
      />
    </div>
  )
}
