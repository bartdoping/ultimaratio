"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import {
  LogOut,
  Menu,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Sparkles as SparklesIcon,
  Wand2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import Logo from "@/components/logo"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  matchPrefix?: string
}

type PlanState = {
  loaded: boolean
  isPro: boolean
  unlimited: boolean
  remaining: number
  dailyLimit: number
  used: number
}

const INITIAL_PLAN: PlanState = {
  loaded: false,
  isPro: false,
  unlimited: false,
  remaining: 0,
  dailyLimit: 0,
  used: 0,
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role =
    (session?.user as { role?: "user" | "admin" } | undefined)?.role ?? "user"
  const isAdmin = role === "admin"
  const email = session?.user?.email ?? ""
  const [mobileOpen, setMobileOpen] = useState(false)
  const [plan, setPlan] = useState<PlanState>(INITIAL_PLAN)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const refreshPlan = async () => {
    try {
      const res = await fetch("/api/ai/generate-questions/quota", {
        credentials: "include",
      })
      const data = await res.json().catch(() => null)
      if (!data?.ok) return
      const q = data.quota ?? {}
      setPlan({
        loaded: true,
        isPro: !!data.isPro,
        unlimited: !!q.unlimited,
        remaining: typeof q.remaining === "number" ? q.remaining : 0,
        dailyLimit: typeof q.dailyLimit === "number" ? q.dailyLimit : 0,
        used: typeof q.used === "number" ? q.used : 0,
      })
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!session) return
    void refreshPlan()
  }, [session])

  useEffect(() => {
    function onUpdate() {
      void refreshPlan()
    }
    window.addEventListener("fragenkreuzen:subscription-updated", onUpdate)
    return () =>
      window.removeEventListener("fragenkreuzen:subscription-updated", onUpdate)
  }, [])

  const navItems: NavItem[] = [
    { href: "/generator", label: "Generator", icon: Wand2 },
    { href: "/account", label: "Account", icon: SettingsIcon },
  ]
  if (isAdmin) {
    navItems.push({
      href: "/admin",
      label: "Admin",
      icon: ShieldCheck,
      matchPrefix: "/admin",
    })
  }

  const isActive = (item: NavItem) =>
    item.matchPrefix
      ? pathname?.startsWith(item.matchPrefix)
      : pathname === item.href

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      {/* Hintergrund: dezenter Glow + feiner Grid (über die ganze App) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,theme(colors.primary/12),transparent_55%),radial-gradient(circle_at_bottom_right,theme(colors.primary/8),transparent_55%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,theme(colors.border/.6)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.border/.6)_1px,transparent_1px)] [background-size:64px_64px] opacity-[0.18]" />
      </div>

      <div className="flex min-h-dvh">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r bg-card/40 backdrop-blur-sm">
          <SidebarContent
            navItems={navItems}
            isActive={isActive}
            email={email}
            plan={plan}
          />
        </aside>

        {/* Mobile Top-Bar */}
        <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur lg:hidden">
          <Link href="/generator" className="flex items-center gap-2">
            <Logo />
            <span className="text-sm font-semibold">fragenkreuzen</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted"
            aria-label="Menü öffnen"
          >
            <Menu className="h-4 w-4" />
          </button>
        </header>

        {/* Mobile Sheet */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Menü schließen"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/50"
            />
            <div className="absolute inset-y-0 left-0 w-72 bg-card shadow-2xl flex flex-col">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <Link
                  href="/generator"
                  className="flex items-center gap-2 font-semibold"
                  onClick={() => setMobileOpen(false)}
                >
                  <Logo />
                  <span className="text-sm">fragenkreuzen</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                  aria-label="Schließen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SidebarContent
                navItems={navItems}
                isActive={isActive}
                email={email}
                plan={plan}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main */}
        <main className="min-w-0 flex-1 pt-14 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  )
}

function SidebarContent({
  navItems,
  isActive,
  email,
  plan,
  onNavigate,
}: {
  navItems: NavItem[]
  isActive: (item: NavItem) => boolean
  email: string
  plan: PlanState
  onNavigate?: () => void
}) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Brand */}
      <div className="hidden lg:flex items-center gap-2 border-b px-5 py-4 font-semibold">
        <Logo />
        <div className="flex flex-col leading-tight">
          <span className="text-sm">fragenkreuzen</span>
          <span className="text-[10px] text-muted-foreground">by ultima-rat.io</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group inline-flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-primary")} />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Plan-Card */}
      <div className="px-3 pb-3">
        <PlanCard plan={plan} />
      </div>

      {/* Account */}
      <div className="border-t px-3 py-3">
        <div className="flex items-center gap-2 px-1 pb-2 text-xs text-muted-foreground">
          <span className="truncate max-w-[16ch]" title={email}>
            {email || "Nicht angemeldet"}
          </span>
        </div>
        {email ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </Button>
        ) : (
          <Button asChild size="sm" className="w-full">
            <Link href="/login" onClick={onNavigate}>
              Anmelden
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

function PlanCard({ plan }: { plan: PlanState }) {
  if (!plan.loaded) {
    return (
      <div className="h-[110px] rounded-xl border bg-muted/20 animate-pulse" />
    )
  }
  if (plan.unlimited) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" /> Unbegrenzt
        </div>
        <p className="text-xs text-muted-foreground">
          Admin-Modus aktiv. Keine täglichen Limits.
        </p>
      </div>
    )
  }
  const pct =
    plan.dailyLimit > 0
      ? Math.min(100, Math.round((plan.used / plan.dailyLimit) * 100))
      : 0
  return (
    <div className="rounded-xl border bg-card/60 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {plan.isPro ? "Pro" : "Kostenlos"}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {plan.remaining}/{plan.dailyLimit}
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
      {!plan.isPro && (
        <Button asChild size="sm" className="w-full h-8 gap-1.5">
          <Link href="/subscription">
            <SparklesIcon className="h-3.5 w-3.5" />
            Auf Pro upgraden
          </Link>
        </Button>
      )}
    </div>
  )
}
