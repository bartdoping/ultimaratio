"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"

interface Highlight {
  id: string
  text: string
}

interface TextHighlighterProps {
  text: string
  questionId: string
  onHighlightsChange?: (highlights: Highlight[]) => void
}

export function TextHighlighter({ text, questionId, onHighlightsChange }: TextHighlighterProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [history, setHistory] = useState<Highlight[][]>([])
  const textRef = useRef<HTMLDivElement>(null)

  // Lade gespeicherte Markierungen für diese Frage
  useEffect(() => {
    const savedHighlights = localStorage.getItem(`highlights-${questionId}`)
    if (savedHighlights) {
      try {
        const parsed = JSON.parse(savedHighlights)
        setHighlights(parsed)
        setHistory([]) // Reset History beim Laden
      } catch (error) {
        console.error('Fehler beim Laden der Markierungen:', error)
      }
    } else {
      // Reset highlights wenn keine gespeicherten für diese Frage
      setHighlights([])
      setHistory([])
    }
  }, [questionId])

  // Speichere Markierungen bei Änderungen
  useEffect(() => {
    localStorage.setItem(`highlights-${questionId}`, JSON.stringify(highlights))
    onHighlightsChange?.(highlights)
  }, [highlights, questionId, onHighlightsChange])

  const handleMouseUp = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString().trim()
      
      // Prüfe, ob diese Markierung bereits existiert
      const exists = highlights.some(h => h.text === selectedText)
      
      if (!exists) {
        setHistory(prev => [...prev, highlights])
        const newHighlight: Highlight = {
          id: `highlight-${Date.now()}-${Math.random()}`,
          text: selectedText
        }

        setHighlights(prev => [...prev, newHighlight])
      }
      
      selection.removeAllRanges()
    }
  }

  const removeHighlight = (highlightId: string) => {
    setHistory(prev => [...prev, highlights])
    setHighlights(prev => prev.filter(h => h.id !== highlightId))
  }

  const clearAllHighlights = () => {
    setHistory(prev => [...prev, highlights])
    setHighlights([])
  }

  const undoLastAction = () => {
    if (history.length > 0) {
      const lastState = history[history.length - 1]
      setHighlights(lastState)
      setHistory(prev => prev.slice(0, -1))
    }
  }

  const renderTextWithHighlights = () => {
    if (highlights.length === 0) {
      return text
    }

    let result = text
    
    // Erstelle Markierungen für jeden markierten Text
    highlights.forEach((highlight) => {
      const regex = new RegExp(`(${highlight.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g')
      result = result.replace(regex, `<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded cursor-pointer hover:bg-yellow-300 dark:hover:bg-yellow-700 transition-colors border border-yellow-300 dark:border-yellow-600" data-highlight-id="${highlight.id}" title="Markierung entfernen: &quot;${highlight.text}&quot;">$1</mark>`)
    })

    return <span dangerouslySetInnerHTML={{ __html: result }} />
  }

  // Event-Handler für das Entfernen von Markierungen
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'MARK' && target.dataset.highlightId) {
        removeHighlight(target.dataset.highlightId)
      }
    }

    if (textRef.current) {
      textRef.current.addEventListener('click', handleClick)
      return () => {
        if (textRef.current) {
          textRef.current.removeEventListener('click', handleClick)
        }
      }
    }
  }, [highlights])

  return (
    <div className="space-y-2">
      {/* Markierungs-Tools */}
      {(highlights.length > 0 || history.length > 0) && (
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground">
            {highlights.length} Markierung{highlights.length !== 1 ? 'en' : ''}
          </span>
          {history.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={undoLastAction}
              className="h-7 px-2 text-xs"
              title="Letzte Aktion rückgängig machen"
            >
              ↶ Rückgängig
            </Button>
          )}
          {highlights.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllHighlights}
              className="h-7 px-2 text-xs"
            >
              Alle entfernen
            </Button>
          )}
        </div>
      )}

      {/* Text mit Markierungen */}
      <div
        ref={textRef}
        className="select-text cursor-text"
        data-text-highlighter="true"
        onMouseUp={handleMouseUp}
        style={{ 
          userSelect: 'text',
          WebkitUserSelect: 'text',
          MozUserSelect: 'text',
          msUserSelect: 'text'
        }}
      >
        {renderTextWithHighlights()}
      </div>

      {/* Anleitung */}
      <div className="text-xs text-muted-foreground">
        💡 Text mit der Maus markieren, um gelb hervorzuheben. Klicke auf Markierungen zum Entfernen.
      </div>
    </div>
  )
}