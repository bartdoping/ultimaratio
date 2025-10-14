"use client"

import { useState, useEffect, useRef } from "react"
import AssistantSidebar from "@/components/ai/assistant-sidebar"

interface LayoutWithSidebarProps {
  children: React.ReactNode
  showAssistant?: boolean
  assistantContext?: any
}

export default function LayoutWithSidebar({ 
  children, 
  showAssistant = false, 
  assistantContext 
}: LayoutWithSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(showAssistant)
  const [sidebarWidth, setSidebarWidth] = useState(320) // Standard-Breite
  const [isDragging, setIsDragging] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)

  // Toggle Sidebar mit Keyboard Shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSidebarOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Persistierte Breite laden/speichern
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai:sidebarWidth")
      if (saved) setSidebarWidth(Math.max(260, Math.min(900, Number(saved))))
      const savedCollapsed = localStorage.getItem("ai:sidebarCollapsed")
      if (savedCollapsed) setCollapsed(savedCollapsed === "1")
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem("ai:sidebarWidth", String(sidebarWidth)) } catch {}
  }, [sidebarWidth])
  useEffect(() => {
    try { localStorage.setItem("ai:sidebarCollapsed", collapsed ? "1" : "0") } catch {}
  }, [collapsed])

  // Drag-Funktionalität für Sidebar-Breite - optimiert für Flüssigkeit
  useEffect(() => {
    let animationFrame: number | null = null
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      // Verwende requestAnimationFrame für flüssige Animation
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
      
      animationFrame = requestAnimationFrame(() => {
        const newWidth = window.innerWidth - e.clientX
        const minWidth = 260
        const maxWidth = Math.min(900, window.innerWidth * 0.55)
        
        // Direkte Berechnung ohne zusätzliche Checks
        const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
        setSidebarWidth(clampedWidth)
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
      document.body.style.pointerEvents = 'auto'
      
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
        animationFrame = null
      }
    }

    if (isDragging) {
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.body.style.pointerEvents = 'none'
      document.addEventListener('mousemove', handleMouseMove, { passive: true })
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [isDragging])

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const effectiveWidth = !sidebarOpen || collapsed ? 0 : sidebarWidth

  return (
    <div className="flex h-screen">
      {/* Main Content */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto">
        {children}
      </div>

      {/* AI Assistant Sidebar - Desktop: als Sidebar, Mobile: als Overlay */}
      {sidebarOpen && (
        <>
          {/* Desktop Sidebar */}
          <div 
            ref={sidebarRef}
            className="hidden lg:block h-full bg-background shadow-lg border-l flex-shrink-0 relative overflow-hidden flex flex-col"
            style={{ 
              width: `${effectiveWidth}px`,
              transition: isDragging ? 'none' : 'width 0.25s ease'
            }}
          >
            {/* Drag Handle */}
            <div
              ref={dragRef}
              onMouseDown={handleDragStart}
              onDoubleClick={() => setCollapsed((v) => !v)}
              className="absolute left-0 top-0 w-[3px] h-full bg-border hover:bg-blue-500 cursor-col-resize transition-colors duration-75 z-10"
              title="Sidebar-Breite anpassen"
            />
            {effectiveWidth > 48 && (
              <div className="h-full overflow-y-auto">
                <AssistantSidebar context={assistantContext} onClose={() => setSidebarOpen(false)} />
              </div>
            )}
            {/* Collapse/Expand Button */}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="absolute -left-3 top-1/2 -translate-y-1/2 hidden lg:flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm"
              title={collapsed ? "Sidebar öffnen" : "Sidebar einklappen"}
            >
              {collapsed ? (
                <span className="text-xs">›</span>
              ) : (
                <span className="text-xs">‹</span>
              )}
            </button>
          </div>
          
          {/* Mobile/Tablet Overlay */}
          <div className="lg:hidden fixed right-0 top-0 h-full z-50 bg-background shadow-lg border-l transition-all duration-300 ease-in-out w-full max-w-sm">
            <AssistantSidebar context={assistantContext} onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Mobile Overlay - nur auf sehr kleinen Bildschirmen */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 h-12 w-12 rounded-full shadow-lg transition-all duration-300 ${
          sidebarOpen 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-gradient-to-br from-blue-600 to-indigo-600 hover:brightness-110'
        } text-white grid place-items-center group`}
        title={sidebarOpen ? "KI-Tutor schließen (Ctrl+K)" : "KI-Tutor öffnen (Ctrl+K)"}
      >
        {sidebarOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="group-hover:scale-110 transition-transform">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="group-hover:scale-110 transition-transform">
            <path d="M9 7a3 3 0 1 1 6 0v1h2a2 2 0 0 1 2 2v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V10a2 2 0 0 1 2-2h2V7z" />
          </svg>
        )}
      </button>

      {/* Drag-Hinweis entfernt */}
    </div>
  )
}
