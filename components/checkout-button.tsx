"use client"

import { useState } from "react"

export function CheckoutButton({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false)

  async function start() {
    try {
      setLoading(true)
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json()
      if (data?.already && data?.redirect) {
        window.location.href = data.redirect
        return
      }
      if (!data?.url) throw new Error("Checkout konnte nicht erstellt werden.")
      window.location.href = data.url
    } catch (e: any) {
      alert(e.message ?? "Fehler beim Checkout.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button className="btn" onClick={start} disabled={loading}>
      {loading ? "Weiter zur Kasse…" : "Jetzt freischalten"}
    </button>
  )
}
