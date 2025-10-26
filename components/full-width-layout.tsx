'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface FullWidthLayoutProps {
  children: ReactNode
}

export function FullWidthLayout({ children }: FullWidthLayoutProps) {
  const pathname = usePathname()
  
  // Prüfungsmodi die volle Breite nutzen sollen
  const isExamMode = pathname.startsWith('/exam-run/') || 
                     pathname.startsWith('/practice/') ||
                     pathname.startsWith('/practice/deck/')
  
  if (isExamMode) {
    return (
      <div className="w-full h-full">
        {children}
      </div>
    )
  }
  
  // Normale Seiten mit Container
  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 py-6">
      {children}
    </div>
  )
}
