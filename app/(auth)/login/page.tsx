// app/(auth)/login/page.tsx
import { Suspense } from "react"
import Link from "next/link"
import { LoginClient } from "./login-client"

// optional – hilfreich bei CSR-Hooks wie useSearchParams in Kindkomponenten
export const dynamic = "force-dynamic"

export default function LoginPage() {
  return (
    <div className="max-w-sm mx-auto p-6 space-y-4">
      <Suspense fallback={<div>Lade…</div>}>
        <LoginClient />
      </Suspense>

      {/* CTA: Registrieren */}
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>Noch kein Konto?</span>
        <Link
          href="/register"
          className="inline-flex items-center h-9 rounded-md border px-3 hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Jetzt registrieren
        </Link>
      </div>
    </div>
  )
}