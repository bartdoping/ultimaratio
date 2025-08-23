// components/stripe-confirm.tsx
"use client";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export function StripeConfirmOnce() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const sid = params.get("session_id");
    if (!sid) return;
    let cancelled = false;
    (async () => {
      try {
        await fetch(`/api/stripe/confirm?session_id=${encodeURIComponent(sid)}`, {
          cache: "no-store",
        });
      } catch {}
      if (!cancelled) router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return null;
}