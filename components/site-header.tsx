// components/site-header.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import ThemeToggle from "@/components/theme-toggle" // ⬅️ default import
import Logo from "@/components/logo"
import { SubscriptionStatus } from "@/components/subscription-status"

export function SiteHeader() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === "admin"
  const email = session?.user?.email ?? ""

  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Logo />
            <div className="flex flex-col">
              <span className="hidden sm:inline">fragenkreuzen.de</span>
              <span className="sm:hidden">fragenkreuzen</span>
              <span className="text-xs text-muted-foreground font-normal">by ultima-rat.io</span>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {navLink("/exams", "Prüfungen")}
            {navLink("/dashboard", "Mein Bereich")}
            {isAdmin && navLink("/admin", "Admin")}
            <a
              href="https://www.ultima-rat.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              Tutor finden
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {session && <SubscriptionStatus />}
          <ThemeToggle />

          {/* Mobile Hamburger Menu */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            aria-expanded={mobileMenuOpen}
            aria-label="Hauptmenü öffnen"
          >
            <svg
              className={`h-6 w-6 transition-transform ${mobileMenuOpen ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop User Menu */}
          {session ? (
            <div
              ref={menuRef}
              className="hidden md:block relative"
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
                    href="/subscription"
                    role="menuitem"
                    className="block rounded px-3 py-2 hover:bg-muted"
                    onClick={() => setMenuOpen(false)}
                  >
                    Abonnement
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
            <div className="hidden md:flex items-center gap-2">
              <Link href="/login" className="btn">Login</Link>
              <Link href="/register" className="btn">Registrieren</Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {/* Navigation Links */}
            <Link
              href="/exams"
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted"
              onClick={() => setMobileMenuOpen(false)}
            >
              Prüfungen
            </Link>
            <Link
              href="/dashboard"
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted"
              onClick={() => setMobileMenuOpen(false)}
            >
              Mein Bereich
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted"
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin
              </Link>
            )}
            <a
              href="https://www.ultima-rat.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted"
              onClick={() => setMobileMenuOpen(false)}
            >
              Tutor finden
            </a>

            {/* User Section */}
            {session ? (
              <div className="border-t pt-4 mt-4">
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Angemeldet als: {email}
                </div>
                <Link
                  href="/account"
                  className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Account
                </Link>
                <Link
                  href="/subscription"
                  className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Abonnement
                </Link>
                <Link
                  href="/dashboard/history"
                  className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Historie
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    signOut({ callbackUrl: "/" })
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-muted"
                >
                  Abmelden
                </button>
              </div>
            ) : (
              <div className="border-t pt-4 mt-4 space-y-1">
                <Link
                  href="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="block px-3 py-2 rounded-md text-base font-medium hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Registrieren
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}