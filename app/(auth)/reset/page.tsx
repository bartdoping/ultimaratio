import { Suspense } from "react"
import ResetClient from "./reset-client"

export const dynamic = "force-dynamic"

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto p-6">Lade…</div>}>
      <ResetClient />
    </Suspense>
  )
}