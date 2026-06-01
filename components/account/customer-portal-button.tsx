"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"

type Props = {
  size?: "sm" | "default" | "lg"
  variant?: "default" | "outline" | "ghost" | "secondary"
  label?: string
  className?: string
}

/**
 * Öffnet das Stripe Customer Portal (Rechnungen, Karte, Kündigung).
 * Funktioniert nur, wenn der User bereits ein Stripe-Abo angelegt hat.
 */
export function CustomerPortalButton({
  size = "sm",
  variant = "outline",
  label = "Rechnungen & Zahlungsdaten",
  className,
}: Props) {
  const [pending, setPending] = useState(false)

  async function open() {
    if (pending) return
    setPending(true)
    try {
      const res = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.ok && typeof data.url === "string") {
        window.location.href = data.url
        return
      }
      if (data?.error === "no_stripe_customer") {
        toast.info("Noch kein Abo aktiv – schließe zuerst Pro ab.")
      } else if (data?.error === "portal_unavailable") {
        toast.error("Stripe-Portal nicht verfügbar", {
          description:
            typeof data.details === "string"
              ? data.details
              : "Bitte später erneut versuchen.",
        })
      } else {
        toast.error("Portal konnte nicht geöffnet werden.")
      }
    } catch {
      toast.error("Netzwerkfehler beim Öffnen des Portals.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={open}
      disabled={pending}
      className={className}
    >
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
      )}
      {pending ? "Öffne Portal…" : label}
    </Button>
  )
}
