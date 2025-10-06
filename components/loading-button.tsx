"use client"

import { Button } from "@/components/ui/button"
import { useLoading } from "@/components/loading-spinner"
import { useRouter } from "next/navigation"
import { ReactNode } from "react"

interface LoadingButtonProps {
  href?: string
  children: ReactNode
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit" | "reset"
}

export function LoadingButton({ 
  href, 
  children, 
  className, 
  variant = "default",
  size = "default",
  onClick,
  disabled = false,
  type = "button"
}: LoadingButtonProps) {
  const { setLoading } = useLoading()
  const router = useRouter()

  const handleClick = async (e: React.MouseEvent) => {
    if (disabled) return

    // Loading starten
    setLoading(true)
    
    try {
      // Custom onClick ausführen
      if (onClick) {
        await onClick()
      }

      // Navigation falls href vorhanden
      if (href && !href.startsWith('http')) {
        setTimeout(() => {
          router.push(href)
        }, 100)
      }
    } catch (error) {
      console.error('Button action failed:', error)
      setLoading(false)
    }
  }

  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}
