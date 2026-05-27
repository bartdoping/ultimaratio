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
    <nav className="rounded-xl border bg-card p-2 shadow-sm" aria-label="Einstellungen">
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
  )
}
