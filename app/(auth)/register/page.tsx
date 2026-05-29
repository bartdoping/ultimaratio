// app/(auth)/register/page.tsx
//
// Die separate Registrierungs-Seite wurde durch den neuen kombinierten
// Auth-Wizard unter `/login` ersetzt. Alte Links / Bookmarks werden
// transparent dorthin weitergeleitet — `callbackUrl` und ggf. `email`
// bleiben erhalten, damit Folge-Flows (Probedeck, Checkout-Rückkehr)
// nicht brechen.
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

type SearchParams = Record<string, string | string[] | undefined>

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const sp = new URLSearchParams()
  const callback =
    typeof params.callbackUrl === "string"
      ? params.callbackUrl
      : typeof params.next === "string"
        ? params.next
        : null
  if (callback) sp.set("callbackUrl", callback)
  const email = typeof params.email === "string" ? params.email : null
  if (email) sp.set("email", email)
  const target = sp.toString() ? `/login?${sp.toString()}` : "/login"
  redirect(target)
}
