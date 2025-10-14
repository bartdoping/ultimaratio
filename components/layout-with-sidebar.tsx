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

  // Drag-Funktionalität für Sidebar-Breite
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      const newWidth = window.innerWidth - e.clientX
      const minWidth = 280
      const maxWidth = Math.min(600, window.innerWidth * 0.6)
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }

    if (isDragging) {
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
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

  return (
    <div className="flex h-screen">
      {/* Main Content */}
      <div 
        className="flex-1 transition-all duration-300"
        style={{ 
          marginRight: sidebarOpen ? `${sidebarWidth}px` : '0px' 
        }}
      >
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </div>

      {/* AI Assistant Sidebar - Desktop: als Sidebar, Mobile: als Overlay */}
      {sidebarOpen && (
        <>
          {/* Desktop Sidebar */}
          <div 
            ref={sidebarRef}
            className="hidden lg:block fixed right-0 top-0 h-full z-50 bg-background shadow-lg border-l transition-all duration-300 ease-in-out"
            style={{ width: `${sidebarWidth}px` }}
          >
            {/* Drag Handle */}
            <div
              ref={dragRef}
              onMouseDown={handleDragStart}
              className="absolute left-0 top-0 w-1 h-full bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors duration-200 hover:w-2"
              title="Sidebar-Breite anpassen"
            />
            <AssistantSidebar context={assistantContext} onClose={() => setSidebarOpen(false)} />
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

      {/* Drag-Hinweis für Desktop */}
      {sidebarOpen && (
        <div className="hidden lg:block fixed right-2 top-1/2 transform -translate-y-1/2 z-50">
          <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 animate-pulse">
            ← Ziehen zum Anpassen
          </div>
        </div>
      )}
    </div>
  )
}
