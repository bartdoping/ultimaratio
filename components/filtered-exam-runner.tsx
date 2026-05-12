"use client"

import { RunnerClient } from "@/components/runner-client"

type Question = {
  id: string
  stem: string
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
  caseVignette?: string | null
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
  return (
    <RunnerClient
      attemptId={attemptId}
      examId={examId}
      passPercent={passPercent}
      allowImmediateFeedback={allowImmediateFeedback}
      questions={allQuestions}
      initialAnswers={initialAnswers}
      initialElapsedSec={initialElapsedSec}
    />
  )
}
