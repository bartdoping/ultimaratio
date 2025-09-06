"use client"

import { useEffect, useState } from "react"
import { RunnerClient } from "@/components/runner-client"

type Question = {
  id: string
  stem: string
  tip?: string | null
  explanation?: string | null
  options: Array<{
    id: string
    text: string
    isCorrect: boolean
    explanation?: string | null
  }>
  media?: Array<{
    id: string
    url: string
    alt: string
    order: number
  }>
  caseId?: string | null
  caseTitle?: string | null
  caseVignette?: string | null
  caseOrder?: number | null
}

type Props = {
  attemptId: string
  examId: string
  passPercent: number
  allowImmediateFeedback: boolean
  allQuestions: Question[]
  initialAnswers: Record<string, string | undefined>
  initialElapsedSec?: number
}

export default function FilteredExamRunner({
  attemptId,
  examId,
  passPercent,
  allowImmediateFeedback,
  allQuestions,
  initialAnswers,
  initialElapsedSec = 0
}: Props) {
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>(allQuestions)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Lade gefilterte Fragen aus SessionStorage
    const stored = sessionStorage.getItem(`filteredQuestions_${attemptId}`)
    
    if (stored) {
      try {
        const filteredIds: string[] = JSON.parse(stored)
        
        // Filtere die Fragen basierend auf den gespeicherten IDs und behalte die Reihenfolge bei
        const filtered = filteredIds
          .map(id => allQuestions.find(q => q.id === id))
          .filter((q): q is Question => q !== undefined)
        
        setFilteredQuestions(filtered)
      } catch (error) {
        console.error("Error parsing filtered questions:", error)
        setFilteredQuestions(allQuestions)
      }
    } else {
      // Keine gefilterten Fragen gefunden, verwende alle
      setFilteredQuestions(allQuestions)
    }
    
    setLoading(false)
  }, [attemptId, allQuestions])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Lade Prüfung...</p>
        </div>
      </div>
    )
  }

  return (
    <RunnerClient
      attemptId={attemptId}
      examId={examId}
      passPercent={passPercent}
      allowImmediateFeedback={allowImmediateFeedback}
      questions={filteredQuestions}
      initialAnswers={initialAnswers}
      initialElapsedSec={initialElapsedSec}
    />
  )
}
