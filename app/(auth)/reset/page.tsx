// app/(auth)/reset/page.tsx
import { Suspense } from "react"
import ResetClient from "./reset-client"

export const dynamic = "force-dynamic"

export default function ResetPage() {
  return (
    <div className="page py-10">
      <div className="card max-w-sm mx-auto">
        <div className="card-body">
          <Suspense fallback={<div className="muted">Lade…</div>}>
            <ResetClient />
          </Suspense>
        </div>
      </div>
    </div>
  )
}