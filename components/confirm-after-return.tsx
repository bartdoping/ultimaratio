// components/confirm-after-return.tsx
"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export function ConfirmAfterReturn() {
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const sid = sp.get("session_id");
    if (!sid) return;
    (async () => {
      try {
        await fetch(`/api/stripe/confirm?session_id=${encodeURIComponent(sid)}`);
      } finally {
        router.refresh(); // Seite neu laden, damit Käufe sofort sichtbar sind
      }
    })();
  }, [sp, router]);

  return null;
}