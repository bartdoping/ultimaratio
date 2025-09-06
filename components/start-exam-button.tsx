// components/start-exam-button.tsx
"use client"

import { useRouter } from "next/navigation"
import StartExamModal from "./start-exam-modal"

type Props = { examId: string }

export function StartExamButton({ examId }: Props) {
  const router = useRouter()

  const handleStart = (attemptId: string) => {
    router.push(`/exam-run/${attemptId}`)
  }

  return (
    <StartExamModal
      examId={examId}
      onStart={handleStart}
    />
  )
}