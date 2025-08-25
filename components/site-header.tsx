// components/site-header.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import ThemeToggle from "@/components/theme-toggle" // ⬅️ default import

export function SiteHeader() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === "admin"
  const email = session?.user?.email ?? ""

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const closeTimer = useRef<number | null>(null)

  function openMenu() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setMenuOpen(true)
  }
  function scheduleClose(delay = 160) {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setMenuOpen(false), delay)
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [menuOpen])

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={[
        "px-2 py-1 rounded hover:bg-muted",
        pathname?.startsWith(href) ? "font-medium" : "text-muted-foreground",
      ].join(" ")}
    >
      {label}
    </Link>
  )

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">UltimaRatio</Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {navLink("/exams", "Prüfungen")}
            {navLink("/dashboard", "Mein Bereich")}
            {isAdmin && navLink("/admin", "Admin")}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {session ? (
            <div
              ref={menuRef}
              className="relative"
              onMouseEnter={openMenu}
              onMouseLeave={() => scheduleClose(160)}
            >
              <button
                type="button"
                onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
                onFocus={openMenu}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="inline-flex max-w-[20ch] items-center gap-2 truncate rounded-md border px-3 py-2 text-sm hover:bg-muted focus:outline-none focus:ring"
              >
                <span className="truncate">{email}</span>
                <svg
                  className={`h-4 w-4 shrink-0 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                </svg>
              </button>

              <div
                role="menu"
                onMouseEnter={openMenu}
                onMouseLeave={() => scheduleClose(160)}
                className={[
                  "absolute right-0 mt-2 w-56 rounded-md border bg-popover shadow-lg transition-all",
                  "origin-top-right",
                  menuOpen
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 -translate-y-1 pointer-events-none",
                ].join(" ")}
              >
                <div className="p-1 text-sm">
                  <Link
                    href="/account"
                    role="menuitem"
                    className="block rounded px-3 py-2 hover:bg-muted"
                    onClick={() => setMenuOpen(false)}
                  >
                    Account
                  </Link>
                  <Link
                    href="/dashboard/history"
                    role="menuitem"
                    className="block rounded px-3 py-2 hover:bg-muted"
                    onClick={() => setMenuOpen(false)}
                  >
                    Historie
                  </Link>
                  <button
                    role="menuitem"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="block w-full rounded px-3 py-2 text-left hover:bg-muted"
                  >
                    Abmelden
                  </button>
                </div>
              </div>
            </div>
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