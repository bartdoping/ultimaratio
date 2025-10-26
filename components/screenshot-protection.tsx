"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"

interface ScreenshotProtectionProps {
  children: React.ReactNode
}

export function ScreenshotProtection({ children }: ScreenshotProtectionProps) {
  const { data: session } = useSession()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Prüfe ob User Admin ist
    const adminEmails = ["info@ultima-rat.io", "admin@fragenkreuzen.de"]
    const isAdminUser = session?.user?.email && adminEmails.includes(session.user.email)
    setIsAdmin(!!isAdminUser)

    // TEMPORÄR DEAKTIVIERT FÜR DEBUGGING
    // if (!isAdminUser && !navigator.userAgent.includes('Mobile')) {
    //   enableScreenshotProtection()
    // }
  }, [session])

  const enableScreenshotProtection = () => {
    // 1. CSS-basierte Schutzmaßnahmen
    const style = document.createElement('style')
    style.textContent = `
      /* Verhindere Screenshots durch CSS */
      body {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      
      /* Verhindere Kontextmenü */
      * {
        -webkit-context-menu: none !important;
        -moz-context-menu: none !important;
        context-menu: none !important;
      }
      
      /* Verhindere Drag & Drop */
      * {
        -webkit-user-drag: none !important;
        -khtml-user-drag: none !important;
        -moz-user-drag: none !important;
        -o-user-drag: none !important;
        user-drag: none !important;
      }
      
      /* Verhindere Textauswahl (außer für TextHighlighter) */
      *:not([data-text-highlighter]):not(.select-text) {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
      
      /* Erlaube Textauswahl für TextHighlighter */
      [data-text-highlighter], .select-text {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
      
      /* Verhindere Bildspeicherung */
      img {
        -webkit-user-drag: none !important;
        -khtml-user-drag: none !important;
        -moz-user-drag: none !important;
        -o-user-drag: none !important;
        user-drag: none !important;
        pointer-events: none !important;
      }
      
      /* Verhindere Rechtsklick */
      * {
        -webkit-touch-callout: none !important;
        -webkit-user-select: none !important;
        -khtml-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
    `
    document.head.appendChild(style)

    // 2. JavaScript-basierte Schutzmaßnahmen
    const preventScreenshot = () => {
      // Verhindere Rechtsklick
      document.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()
        return false
      }, { capture: true })

      // Verhindere F12, Ctrl+Shift+I, Ctrl+U, etc.
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
        const hasModifier = e.ctrlKey || e.altKey || e.shiftKey || e.metaKey
        const isSingleModifier = (e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey && e.key === 'Control') ||
                                (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey && e.key === 'Alt') ||
                                (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && e.key === 'Shift') ||
                                (e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'Meta')
        
        if (isSingleModifier) {
          return // Ignoriere einzelne Modifier-Tasten
        }
        
        // === WINDOWS SCREENSHOT/SCREENRECORDING SHORTCUTS ===
        
        // Print Screen (Gesamter Bildschirm)
        if (e.key === 'PrintScreen') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Alt+Print Screen (Aktives Fenster)
        if (e.altKey && e.key === 'PrintScreen') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Windows+Print Screen (Screenshot als Datei speichern)
        if (e.metaKey && e.key === 'PrintScreen') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Windows+Shift+S (Snipping Tool)
        if (e.metaKey && e.shiftKey && e.key === 'S') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Windows+G (Xbox Game Bar - Screen Recording)
        if (e.metaKey && e.key === 'g') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // === MACOS SCREENSHOT/SCREENRECORDING SHORTCUTS ===
        
        // Cmd+Shift+3 (Gesamter Bildschirm)
        if (e.metaKey && e.shiftKey && e.key === '3') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Cmd+Shift+4 (Ausgewählter Bereich)
        if (e.metaKey && e.shiftKey && e.key === '4') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Cmd+Shift+5 (Bildschirmfoto-App)
        if (e.metaKey && e.shiftKey && e.key === '5') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Cmd+Shift+6 (Touch Bar Screenshot)
        if (e.metaKey && e.shiftKey && e.key === '6') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // === ALLGEMEINE DEVELOPER TOOLS & BROWSER SHORTCUTS ===
        
        // F12 (Developer Tools)
        if (e.key === 'F12') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Ctrl+Shift+I (Developer Tools)
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Cmd+Option+I (Developer Tools auf Mac)
        if (e.metaKey && e.altKey && e.key === 'I') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Ctrl+U (View Source)
        if (e.ctrlKey && e.key === 'u') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Cmd+Option+U (View Source auf Mac)
        if (e.metaKey && e.altKey && e.key === 'u') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // === COPY/PASTE/SELECT SHORTCUTS ===
        
        // Ctrl+S (Save)
        if (e.ctrlKey && e.key === 's') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Cmd+S (Save auf Mac)
        if (e.metaKey && e.key === 's') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Ctrl+A (Select All)
        if (e.ctrlKey && e.key === 'a') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Cmd+A (Select All auf Mac)
        if (e.metaKey && e.key === 'a') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Ctrl+C (Copy)
        if (e.ctrlKey && e.key === 'c') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Cmd+C (Copy auf Mac)
        if (e.metaKey && e.key === 'c') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Ctrl+V (Paste)
        if (e.ctrlKey && e.key === 'v') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Cmd+V (Paste auf Mac)
        if (e.metaKey && e.key === 'v') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Ctrl+X (Cut)
        if (e.ctrlKey && e.key === 'x') {
          e.preventDefault()
          e.stopPropagation()
          lastKeyTime = now
          lastKeyCombo = keyCombo
          return false
        }
        
        // Cmd+X (Cut auf Mac)
        if (e.metaKey && e.key === 'x') {
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
        e.stopPropagation()
        return false
      }, { capture: true })

      // Verhindere Drag & Drop
      document.addEventListener('dragstart', (e) => {
        e.preventDefault()
        e.stopPropagation()
        return false
      }, { capture: true })

      // Verhindere Bildspeicherung
      document.addEventListener('dragstart', (e) => {
        if (e.target instanceof HTMLImageElement) {
          e.preventDefault()
          e.stopPropagation()
          return false
        }
      }, { capture: true })

      // Verhindere Screenshot-Apps (Android/iOS) - nur wenn nicht auf Coming-Soon-Seite
      if (navigator.userAgent.includes('Mobile') && !window.location.pathname.includes('/coming-soon')) {
        // Verhindere Screenshot auf mobilen Geräten
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            // Seite ist versteckt - möglicherweise Screenshot
            document.body.style.display = 'none'
            setTimeout(() => {
              document.body.style.display = 'block'
            }, 100)
          }
        })
      }

      // Verhindere Developer Tools
      let devtools = false
      const threshold = 160
      
      setInterval(() => {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
          if (!devtools) {
            devtools = true
            // Developer Tools erkannt - Seite neu laden
            window.location.reload()
          }
        } else {
          devtools = false
        }
      }, 500)

      // Verhindere Screenshot durch Canvas-Manipulation
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
      HTMLCanvasElement.prototype.toDataURL = function() {
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      }

      // Verhindere Screenshot durch getImageData
      const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData
      CanvasRenderingContext2D.prototype.getImageData = function() {
        return new ImageData(new Uint8ClampedArray(4), 1, 1)
      }
    }

    // Schutz aktivieren
    preventScreenshot()

    // Cleanup-Funktion
    return () => {
      // Entferne Event Listener beim Unmount
      document.removeEventListener('contextmenu', preventScreenshot)
      document.removeEventListener('keydown', preventScreenshot)
      document.removeEventListener('selectstart', preventScreenshot)
      document.removeEventListener('dragstart', preventScreenshot)
    }
  }

  // Für Admins: Kein Schutz
  if (isAdmin) {
    return <>{children}</>
  }

  // Für Non-Admin-User: Schutz aktiviert
  return (
    <div 
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none'
      } as React.CSSProperties}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}
    </div>
  )
}
