"use client"

import * as React from "react"

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  confirmText: string
}

export default function ConfirmSubmitButton({ confirmText, onClick, ...props }: Props) {
  return (
    <button
      {...props}
      onClick={(e) => {
        const ok = confirm(confirmText)
        if (!ok) {
          e.preventDefault()
          return
        }
        onClick?.(e)
      }}
    />
  )
}

