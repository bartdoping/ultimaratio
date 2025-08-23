import { Suspense } from "react"
import { LoginClient } from "./login-client"

export const dynamic = "force-dynamic"

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto p-6">Lade…</div>}>
      <LoginClient />
    </Suspense>
  )
}