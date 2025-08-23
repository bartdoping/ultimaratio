// components/start-exam-button.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

type Props = { examId: string }

export function StartExamButton({ examId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onClick() {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.attemptId) {
        throw new Error(data?.error || "Fehler beim Starten")
      }
      router.push(`/exam-run/${data.attemptId}`)
    } catch (e: any) {
      setErr(e?.message || "Unbekannter Fehler")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={onClick} disabled={loading} className="w-full sm:w-auto">
        {loading ? "Lade..." : "Prüfung starten"}
      </Button>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  )
}