import { Suspense } from "react"
import { VerifyClient } from "./verify-client"

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto p-6">Lade…</div>}>
      <VerifyClient />
    </Suspense>
  )
}