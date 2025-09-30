"use client"

import { useState, useEffect } from "react"
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

  return (
    <div className="flex h-screen">
      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'mr-80' : 'mr-0'}`}>
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </div>

      {/* AI Assistant Sidebar */}
      {sidebarOpen && (
        <div className="fixed right-0 top-0 h-full w-80 z-50">
          <AssistantSidebar context={assistantContext} />
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-lg transition-all duration-300 ${
          sidebarOpen 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-gradient-to-br from-blue-600 to-indigo-600 hover:brightness-110'
        } text-white grid place-items-center`}
        title={sidebarOpen ? "KI-Tutor schließen" : "KI-Tutor öffnen (Ctrl+K)"}
      >
        {sidebarOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 7a3 3 0 1 1 6 0v1h2a2 2 0 0 1 2 2v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V10a2 2 0 0 1 2-2h2V7z" />
          </svg>
        )}
      </button>
    </div>
  )
}
