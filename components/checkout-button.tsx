// components/checkout-button.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Props = { slug: string }

export function CheckoutButton({ slug }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onClick() {
    setErr(null)
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || "Checkout fehlgeschlagen")
      }
      if (data?.alreadyPurchased) {
        router.refresh()
        return
      }
      if (!data?.url) {
        throw new Error("Keine Checkout-URL erhalten")
      }
      window.location.href = data.url as string
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Checkout fehlgeschlagen")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex h-10 items-center justify-center rounded-md bg-black text-white px-4 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Weiterleiten…" : "Jetzt kaufen (Einmalzahlung)"}
      </button>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  )
}