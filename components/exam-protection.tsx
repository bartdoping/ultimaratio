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
      // Verhindere Tab-Wechsel während Prüfung
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // Tab gewechselt - Warnung anzeigen
          alert('⚠️ ACHTUNG: Tab-Wechsel während der Prüfung ist nicht erlaubt!')
          // Seite neu laden
          window.location.reload()
        }
      })

      // Verhindere Alt+Tab (Windows) / Cmd+Tab (Mac)
      document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 'Tab') {
          e.preventDefault()
          alert('⚠️ ACHTUNG: Alt+Tab ist während der Prüfung nicht erlaubt!')
          return false
        }
        if (e.metaKey && e.key === 'Tab') {
          e.preventDefault()
          alert('⚠️ ACHTUNG: Cmd+Tab ist während der Prüfung nicht erlaubt!')
          return false
        }
      })

      // Verhindere Window-Focus-Verlust
      let focusLost = false
      window.addEventListener('blur', () => {
        focusLost = true
        setTimeout(() => {
          if (focusLost) {
            alert('⚠️ ACHTUNG: Fokus-Verlust während der Prüfung ist nicht erlaubt!')
            window.location.reload()
          }
        }, 1000)
      })

      window.addEventListener('focus', () => {
        focusLost = false
      })

      // Verhindere Screenshot-Apps auf mobilen Geräten
      if (navigator.userAgent.includes('Mobile')) {
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
      document.addEventListener('keydown', (e) => {
        // Alle Ctrl/Alt/Cmd Kombinationen blockieren
        if (e.ctrlKey || e.altKey || e.metaKey) {
          e.preventDefault()
          alert('⚠️ ACHTUNG: Tastenkombinationen sind während der Prüfung nicht erlaubt!')
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
