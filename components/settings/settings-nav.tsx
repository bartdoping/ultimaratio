"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const items = [
  {
    href: "/account",
    label: "Account",
    description: "Profil, Login, Generator-Nutzung",
  },
  {
    href: "/subscription",
    label: "Abonnement",
    description: "Pro, Laufzeit und Verwaltung",
  },
] as const

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile: horizontale Pill-Bar */}
      <nav
        aria-label="Einstellungen"
        className="-mx-4 overflow-x-auto px-4 pb-2 lg:hidden"
      >
        <div className="flex w-max gap-1.5">
          {items.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex h-9 items-center whitespace-nowrap rounded-full border px-4 text-sm transition-colors",
                  active
                    ? "border-primary/40 bg-primary/10 font-medium text-foreground"
                    : "border-border bg-card/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop: vertikale Karte */}
      <nav
        className="hidden rounded-xl border bg-card p-2 shadow-sm lg:block"
        aria-label="Einstellungen"
      >
        {items.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-lg px-3 py-2.5 transition-colors",
                active
                  ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <div className={cn("text-sm font-medium", active && "text-foreground")}>
                {item.label}
              </div>
              <div className="text-xs opacity-80">{item.description}</div>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
