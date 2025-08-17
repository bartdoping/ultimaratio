"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"

export function SiteHeader() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === "admin"

  return (
    <header className="border-b">
      <div className="container h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold">UltimaRatio</Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/exams" className={pathname?.startsWith("/exams") ? "font-medium" : ""}>Prüfungen</Link>
          <Link href="/dashboard" className={pathname?.startsWith("/dashboard") ? "font-medium" : ""}>Mein Bereich</Link>
          {isAdmin && <Link href="/admin" className={pathname?.startsWith("/admin") ? "font-medium" : ""}>Admin</Link>}
        </nav>
        <div className="flex items-center gap-2">
          {session ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline-flex">
                {(session.user?.email) ?? ""} ({(session.user as any)?.role})
              </span>
              <button className="btn" onClick={() => signOut({ callbackUrl: "/" })}>Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn">Login</Link>
              <Link href="/register" className="btn">Registrieren</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
