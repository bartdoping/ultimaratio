"use client"

import { usePathname } from "next/navigation"
import { AppShell } from "@/components/app-shell/app-shell"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { FullWidthLayout } from "@/components/full-width-layout"

/**
 * Wählt anhand des Pfads zwischen klassischem Marketing-Chrome (Header +
 * Footer) und der neuen App-Shell mit Sidebar. So bekommen normale Nutzer
 * im Kern-Workflow (Generator, Account, Subscription, Admin) das App-Feel,
 * während Landingpage und öffentliche Inhalte ihre Marketing-Struktur
 * behalten.
 */
const APP_PREFIXES = [
  "/generator",
  "/account",
  "/subscription",
  "/admin",
  "/dashboard",
  "/decks",
  "/sr",
  "/practice",
  "/exam-run",
]

function isAppRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return APP_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

export function LayoutSwitch({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (isAppRoute(pathname)) {
    return <AppShell>{children}</AppShell>
  }
  // Marketing/Landingpage/Auth-Wizard: bestehende Header/Footer-Struktur.
  return (
    <div className="min-h-dvh flex flex-col">
      <SiteHeader />
      <main className="flex-1 w-full">
        <FullWidthLayout>{children}</FullWidthLayout>
      </main>
      <Footer />
    </div>
  )
}
