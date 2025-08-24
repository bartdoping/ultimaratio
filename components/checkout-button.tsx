// components/checkout-button.tsx
"use client";

import { useState } from "react";

type Props = { slug: string };

export function CheckoutButton({ slug }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Checkout fehlgeschlagen");
      }
      // Weiterleitung zu Stripe
      window.location.href = data.url as string;
    } catch (e: any) {
      setErr(e.message || "Checkout fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={onClick}
        disabled={loading}
        className="inline-flex h-10 items-center justify-center rounded-md bg-black text-white px-4 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Weiterleiten…" : "Jetzt freischalten"}
      </button>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}