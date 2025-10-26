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
  const [collapsed, setCollapsed] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

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

  // Persistierte Collapsed-State laden/speichern
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem("ai:sidebarCollapsed")
      if (savedCollapsed) setCollapsed(savedCollapsed === "1")
    } catch {}
  }, [])
  
  useEffect(() => {
    try { localStorage.setItem("ai:sidebarCollapsed", collapsed ? "1" : "0") } catch {}
  }, [collapsed])

  return (
    <div className="flex min-h-screen">
      {/* Main Content */}
      <div className="flex-1 min-w-0 min-h-screen overflow-y-auto">
        {children}
      </div>

      {/* AI Assistant Sidebar - Desktop: als Sidebar, Mobile: als Overlay */}
      {sidebarOpen && (
        <>
          {/* Desktop Sidebar */}
          <div 
            ref={sidebarRef}
            className={`hidden lg:block bg-background shadow-lg border-l flex-shrink-0 relative overflow-hidden flex flex-col transition-all duration-300 ${
              collapsed ? 'w-12' : 'w-96'
            }`}
            style={{ height: 'calc(50vh - 1rem)', marginTop: '1rem', marginBottom: '1rem' }}
          >
            {!collapsed && (
              <div className="h-full overflow-y-auto">
                <AssistantSidebar context={assistantContext} onClose={() => setSidebarOpen(false)} />
              </div>
            )}
            
            {/* Collapse/Expand Button */}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="absolute -left-4 top-1/2 -translate-y-1/2 hidden lg:flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-lg hover:shadow-xl transition-all"
              title={collapsed ? "KI-Tutor öffnen" : "KI-Tutor einklappen"}
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
