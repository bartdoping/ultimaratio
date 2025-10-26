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
  const [sidebarWidth, setSidebarWidth] = useState(280) // Standard-Breite
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
      if (saved) {
        setSidebarWidth(Math.max(240, Math.min(600, Number(saved))))
      } else if (typeof window !== 'undefined') {
        // Responsive Startbreite: ca. 30% des Viewports, begrenzt
        const vw = window.innerWidth
        const target = Math.max(280, Math.min(400, Math.round(vw * 0.25)))
        setSidebarWidth(target)
      }
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

  // Vereinfachte Drag-Funktionalität für Sidebar-Breite
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      const newWidth = window.innerWidth - e.clientX
      // Einfache, feste Grenzen
      const minWidth = 240
      const maxWidth = 500
      
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
      setSidebarWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
      document.body.style.pointerEvents = 'auto'
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
    }
  }, [isDragging])

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const effectiveWidth = !sidebarOpen || collapsed ? 0 : sidebarWidth
  const isCompact = effectiveWidth > 0 && effectiveWidth < 300

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
              maxWidth: '30vw',
              transition: isDragging ? 'none' : 'width 0.25s ease'
            }}
          >
            {/* Drag Handle */}
            <div
              ref={dragRef}
              onMouseDown={handleDragStart}
              onDoubleClick={() => setCollapsed((v) => !v)}
              className="absolute left-0 top-0 h-full cursor-col-resize z-10"
              title="Sidebar-Breite anpassen"
              style={{ width: '5px' }}
            >
              {/* sichtbarer 2px-Griff, rest transparentes Hit-Area */}
              <div className="absolute inset-y-0 left-0 w-[2px] bg-border hover:bg-blue-500 transition-colors" />
            </div>
            {effectiveWidth > 48 && (
              <div className="h-full overflow-y-auto">
                <AssistantSidebar context={assistantContext} onClose={() => setSidebarOpen(false)} compact={isCompact} />
              </div>
            )}
            {/* Collapse/Expand Button */}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="absolute -left-4 top-1/2 -translate-y-1/2 hidden lg:flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-lg hover:shadow-xl transition-all"
              title={collapsed ? "Sidebar öffnen" : "Sidebar einklappen"}
            >
              {collapsed ? (
                <span className="text-sm font-bold">›</span>
              ) : (
                <span className="text-sm font-bold">‹</span>
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
