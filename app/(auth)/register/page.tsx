import { Suspense } from "react"
import { RegisterClient } from "./register-client"

export const dynamic = "force-dynamic"

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto p-6 text-sm text-muted-foreground">Lade…</div>}>
      <RegisterClient />
    </Suspense>
  )
}
