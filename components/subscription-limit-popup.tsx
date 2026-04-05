// components/subscription-limit-popup.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface SubscriptionLimitPopupProps {
  isOpen: boolean
  onClose: () => void
  onUpgrade: () => void
}

export function SubscriptionLimitPopup({
  isOpen,
  onClose,
  onUpgrade,
}: SubscriptionLimitPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Pro erforderlich</DialogTitle>
          <DialogDescription className="text-center">
            Übungsmodus und die zugehörigen Funktionen sind Teil von fragenkreuzen.de Pro.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Mit Pro erhältst du unter anderem unbegrenztes Üben und den vollen Funktionsumfang.
            </p>
            <p className="text-sm font-medium">
              Mit fragenkreuzen.de Pro erhältst du:
            </p>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Unbegrenzte Fragen pro Tag</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Zugang zu allen Prüfungsfragen</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Detaillierte Statistiken</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Spaced Repetition System</span>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-lg font-semibold text-primary">
              Nur 9,99€ pro Monat
            </p>
            <p className="text-xs text-muted-foreground">
              Jederzeit kündbar
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Später
          </Button>
          <Button onClick={onUpgrade} className="flex-1">
            Jetzt upgraden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
