// components/start-exam-button.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import StartExamModal from "./start-exam-modal"
import { Button } from "@/components/ui/button"

type Props = { examId: string; disableStartPopup?: boolean }

export function StartExamButton({ examId, disableStartPopup = false }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleStart = (attemptId: string) => {
    router.push(`/exam-run/${attemptId}`)
  }

  const handleDirectStart = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.attemptId) {
        throw new Error(j?.error || "start failed")
      }
      router.push(`/exam-run/${j.attemptId}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    disableStartPopup ? (
      <Button onClick={handleDirectStart} disabled={loading}>
        {loading ? "Starte..." : "Prüfung starten"}
      </Button>
    ) : (
      <StartExamModal
        examId={examId}
        onStart={handleStart}
      />
    )
  )
}