// app/(auth)/verify/page.tsx
import { Suspense } from "react"
import { VerifyClient } from "./verify-client"

export default function VerifyPage() {
  return (
    <div className="page py-10">
      <div className="card max-w-sm mx-auto">
        <div className="card-body">
          <Suspense fallback={<div className="muted">Lade…</div>}>
            <VerifyClient />
          </Suspense>
        </div>
      </div>
    </div>
  )
}