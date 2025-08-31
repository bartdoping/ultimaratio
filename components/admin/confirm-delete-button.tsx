// components/admin/confirm-delete-button.tsx
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"

type Props = Omit<React.ComponentProps<typeof Button>, "onClick"> & {
  /** Sicherheitsnachricht im Bestätigungsdialog */
  message: string
}

/**
 * Button, der vor dem Submit eine Bestätigungsabfrage zeigt.
 * Verhindert Submit, wenn der Dialog abgebrochen wird.
 */
export default function ConfirmDeleteButton({
  message,
  ...rest
}: Props) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const ok = window.confirm(message)
    if (!ok) {
      e.preventDefault()
      e.stopPropagation()
    }
    // Wenn ok === true, lässt der Button das Form ganz normal submitten
  }

  return (
    <Button
      {...rest}
      type={rest.type ?? "submit"}
      variant={rest.variant ?? "destructive"}
      onClick={handleClick}
    />
  )
}