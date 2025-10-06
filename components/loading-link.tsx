"use client"

import Link from "next/link"
import { useLoading } from "@/components/loading-spinner"
import { useRouter } from "next/navigation"
import { ReactNode } from "react"

interface LoadingLinkProps {
  href: string
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function LoadingLink({ href, children, className, onClick }: LoadingLinkProps) {
  const { setLoading } = useLoading()
  const router = useRouter()

  const handleClick = (e: React.MouseEvent) => {
    // Nur bei Link-Klicks, nicht bei externen Links oder Downloads
    if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return
    }

    // Loading starten
    setLoading(true)
    
    // Custom onClick ausführen
    if (onClick) {
      onClick()
    }

    // Navigation nach kurzer Verzögerung (für bessere UX)
    setTimeout(() => {
      router.push(href)
    }, 100)
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  )
}
