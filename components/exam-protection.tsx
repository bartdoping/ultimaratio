"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"

interface ExamProtectionProps {
  children: React.ReactNode
  examMode?: boolean
}

export function ExamProtection({ children, examMode = false }: ExamProtectionProps) {
  const { data: session } = useSession()

  useEffect(() => {
    // Prüfe ob User Admin ist
    const adminEmails = ["info@ultima-rat.io", "admin@fragenkreuzen.de"]
    const isAdminUser = session?.user?.email && adminEmails.includes(session.user.email)
    
    // Nur für Non-Admin-User und im Exam-Modus: Erweiterte Schutzmaßnahmen
    if (!isAdminUser && examMode) {
      enableExamProtection()
    }
  }, [session, examMode])

  const enableExamProtection = () => {
    // Erweiterte Schutzmaßnahmen für Prüfungen
    const examProtection = () => {
      // Tab-Wechsel-Verhinderung entfernt

      // Alt+Tab / Cmd+Tab Verhinderung entfernt

      // Window-Focus-Verlust-Verhinderung entfernt

      // Verhindere Screenshot-Apps auf mobilen Geräten - nur wenn nicht auf Coming-Soon-Seite
      if (navigator.userAgent.includes('Mobile') && !window.location.pathname.includes('/coming-soon')) {
        // Verhindere Screenshot durch Page Visibility API
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            // Möglicherweise Screenshot - Seite verstecken
            document.body.style.opacity = '0'
            document.body.style.transition = 'opacity 0.1s'
            
            setTimeout(() => {
              document.body.style.opacity = '1'
            }, 100)
          }
        })

        // Verhindere Screenshot durch Touch-Events
        let touchStartTime = 0
        document.addEventListener('touchstart', (e) => {
          touchStartTime = Date.now()
        })

        document.addEventListener('touchend', (e) => {
          const touchDuration = Date.now() - touchStartTime
          // Längerer Touch könnte Screenshot sein
          if (touchDuration > 2000) {
            e.preventDefault()
            alert('⚠️ ACHTUNG: Längerer Touch ist während der Prüfung nicht erlaubt!')
            return false
          }
        })
      }

      // Verhindere Developer Tools
      let devtools = false
      const threshold = 160
      
      const checkDevTools = () => {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
          if (!devtools) {
            devtools = true
            alert('⚠️ ACHTUNG: Developer Tools sind während der Prüfung nicht erlaubt!')
            // Seite neu laden
            window.location.reload()
          }
        } else {
          devtools = false
        }
      }

      // Prüfe alle 500ms
      setInterval(checkDevTools, 500)

      // Verhindere Kontextmenü
      document.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        alert('⚠️ ACHTUNG: Rechtsklick ist während der Prüfung nicht erlaubt!')
        return false
      }, { capture: true })

      // Verhindere alle Shortcuts
      let lastKeyTime = 0
      let lastKeyCombo = ''
      
      document.addEventListener('keydown', (e) => {
        const now = Date.now()
        const keyCombo = `${e.ctrlKey ? 'ctrl+' : ''}${e.altKey ? 'alt+' : ''}${e.shiftKey ? 'shift+' : ''}${e.metaKey ? 'meta+' : ''}${e.key}`
        
        // Verhindere mehrfache Popups für dieselbe Kombination
        if (now - lastKeyTime < 1000 && lastKeyCombo === keyCombo) {
          e.preventDefault()
          e.stopPropagation()
          return false
        }
        
        // Nur bei echten Tastenkombinationen reagieren (nicht bei einzelnen Modifier-Tasten)
        const isSingleModifier = (e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey && e.key === 'Control') ||
                                (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey && e.key === 'Alt') ||
                                (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && e.key === 'Shift') ||
                                (e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'Meta')
        
        if (isSingleModifier) {
          return // Ignoriere einzelne Modifier-Tasten
        }
        
        // Alle Ctrl/Alt/Cmd Kombinationen blockieren
        if (e.ctrlKey || e.altKey || e.metaKey) {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
      }, { capture: true })

      // Verhindere Textauswahl
      document.addEventListener('selectstart', (e) => {
        e.preventDefault()
        return false
      }, { capture: true })

      // Verhindere Drag & Drop
      document.addEventListener('dragstart', (e) => {
        e.preventDefault()
        return false
      }, { capture: true })

      // Verhindere Copy/Paste
      document.addEventListener('copy', (e) => {
        e.preventDefault()
        return false
      }, { capture: true })

      document.addEventListener('paste', (e) => {
        e.preventDefault()
        return false
      }, { capture: true })

      document.addEventListener('cut', (e) => {
        e.preventDefault()
        return false
      }, { capture: true })
    }

    // Schutz aktivieren
    examProtection()
  }

  return <>{children}</>
}
