// components/confirm-after-return.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export function ConfirmAfterReturn() {
  const sp = useSearchParams();
  const router = useRouter();
  const { data: session, update } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const sid = sp.get("session_id");
    if (!sid || isProcessing) return;
    
    setIsProcessing(true);
    
    (async () => {
      try {
        // Bestätige den Kauf
        const response = await fetch(`/api/stripe/confirm?session_id=${encodeURIComponent(sid)}`);
        const result = await response.json();
        
        if (result.ok) {
          // Session aktualisieren, um sicherzustellen, dass sie erhalten bleibt
          if (session) {
            await update();
          }
          
          // URL bereinigen (session_id entfernen)
          const url = new URL(window.location.href);
          url.searchParams.delete('session_id');
          window.history.replaceState({}, '', url.toString());
        }
      } catch (error) {
        console.error('Error confirming purchase:', error);
      } finally {
        // Seite neu laden, damit Käufe sofort sichtbar sind
        router.refresh();
        setIsProcessing(false);
      }
    })();
  }, [sp, router, session, update, isProcessing]);

  return null;
}