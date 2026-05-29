// app/(auth)/login/page.tsx
//
// Neue, modernisierte Auth-Seite: kombinierter Login-/Registrierungs-Flow,
// E-Mail-first, optional OAuth, optional Cloudflare-Turnstile.
import { Suspense } from "react"
import { AuthClient } from "./auth-client"
import { listConfiguredOAuthProviders } from "@/lib/auth-providers"
import { captchaSiteKey } from "@/lib/captcha"

export const dynamic = "force-dynamic"

export default function LoginPage() {
  const providers = listConfiguredOAuthProviders()
  const turnstileSiteKey = captchaSiteKey()

  return (
    <Suspense fallback={null}>
      <AuthClient providers={providers} turnstileSiteKey={turnstileSiteKey} />
    </Suspense>
  )
}
