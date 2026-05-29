"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import { CreditCard, LogOut, Settings, Sparkles, User as UserIcon } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type AccountSheetPlan = {
  isPro: boolean
  unlimited: boolean
  remaining: number
  dailyLimit: number
  used: number
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
  plan: AccountSheetPlan
  isLoggedIn: boolean
  isAdmin: boolean
}

export function AccountSheet({
  open,
  onOpenChange,
  email,
  plan,
  isLoggedIn,
  isAdmin,
}: Props) {
  const pct =
    plan.dailyLimit > 0
      ? Math.min(100, Math.round((plan.used / plan.dailyLimit) * 100))
      : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "rounded-t-2xl border-t bg-card p-0 pb-[max(env(safe-area-inset-bottom),0px)]",
          // Auf Tablet/Desktop wirkt es wie ein normales Bottom-Panel, aber
          // mit deckelnder Max-Breite.
          "sm:right-4 sm:bottom-4 sm:left-auto sm:max-w-sm sm:rounded-2xl sm:border"
        )}
      >
        <SheetHeader className="border-b px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <UserIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-left text-sm">
                {email || "Nicht angemeldet"}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-1.5 pt-0.5 text-left text-xs">
                {plan.unlimited ? (
                  <Badge
                    variant="secondary"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  >
                    Unbegrenzt
                  </Badge>
                ) : plan.isPro ? (
                  <Badge variant="default">Pro</Badge>
                ) : (
                  <Badge variant="outline">Kostenlos</Badge>
                )}
                {isAdmin && (
                  <Badge variant="secondary" className="border-primary/30">
                    Admin
                  </Badge>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4 px-5 py-4">
          {/* Quota-Card */}
          {isLoggedIn && !plan.unlimited && (
            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">
                  Heute verfügbar
                </span>
                <span className="font-semibold tabular-nums">
                  {plan.remaining} / {plan.dailyLimit}
                </span>
              </div>
              <Progress value={pct} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {plan.remaining > 0
                  ? `Noch ${plan.remaining} Generierungen heute.`
                  : "Tageslimit erreicht — Reset um Mitternacht (MEZ)."}
              </p>
            </div>
          )}

          {/* Aktionen */}
          {isLoggedIn ? (
            <div className="grid gap-1">
              <SheetLink
                href="/account"
                icon={Settings}
                onSelect={() => onOpenChange(false)}
              >
                Account
              </SheetLink>
              <SheetLink
                href="/subscription"
                icon={CreditCard}
                onSelect={() => onOpenChange(false)}
              >
                {plan.isPro ? "Abo verwalten" : "Pro freischalten"}
              </SheetLink>
              {!plan.isPro && !plan.unlimited && (
                <Button
                  asChild
                  size="sm"
                  className="mt-2 h-10 w-full gap-2"
                  onClick={() => onOpenChange(false)}
                >
                  <Link href="/subscription">
                    <Sparkles className="h-4 w-4" />
                    Auf Pro upgraden
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-2">
              <Button
                asChild
                size="sm"
                className="h-10 w-full"
                onClick={() => onOpenChange(false)}
              >
                <Link href="/login?callbackUrl=/generator">Anmelden</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-10 w-full"
                onClick={() => onOpenChange(false)}
              >
                <Link href="/login?callbackUrl=/generator">
                  Kostenlos registrieren
                </Link>
              </Button>
            </div>
          )}
        </div>

        {isLoggedIn && (
          <div className="border-t px-5 py-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                onOpenChange(false)
                signOut({ callbackUrl: "/login" })
              }}
            >
              <LogOut className="h-4 w-4" />
              Abmelden
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function SheetLink({
  href,
  icon: Icon,
  children,
  onSelect,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  onSelect?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className="inline-flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span>{children}</span>
    </Link>
  )
}
