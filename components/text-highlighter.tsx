"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

interface Highlight {
  id: string
  start: number
  end: number
  text: string
}

interface TextHighlighterProps {
  text: string
  questionId: string
  onHighlightsChange?: (highlights: Highlight[]) => void
}

export function TextHighlighter({ text, questionId, onHighlightsChange }: TextHighlighterProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<number | null>(null)
  const [history, setHistory] = useState<Highlight[][]>([])
  const textRef = useRef<HTMLDivElement>(null)

  // Lade gespeicherte Markierungen beim Laden der Komponente
  useEffect(() => {
    const saved = localStorage.getItem(`highlights-${questionId}`)
    if (saved) {
      try {
        const parsedHighlights = JSON.parse(saved)
        setHighlights(parsedHighlights)
        onHighlightsChange?.(parsedHighlights)
      } catch (error) {
        console.error("Fehler beim Laden der Markierungen:", error)
      }
    }
  }, [questionId, onHighlightsChange])

  // Speichere Markierungen bei Änderungen
  useEffect(() => {
    localStorage.setItem(`highlights-${questionId}`, JSON.stringify(highlights))
    onHighlightsChange?.(highlights)
  }, [highlights, questionId, onHighlightsChange])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Linke Maustaste
      setIsSelecting(true)
    }
  }

  const handleMouseUp = () => {
    if (isSelecting) {
      const selection = window.getSelection()
      if (selection && selection.toString().trim()) {
        const selectedText = selection.toString().trim()
        
        // Finde alle Vorkommen des ausgewählten Textes
        const occurrences: { start: number; end: number }[] = []
        let index = 0
        while ((index = text.indexOf(selectedText, index)) !== -1) {
          occurrences.push({
            start: index,
            end: index + selectedText.length
          })
          index += selectedText.length
        }
        
        // Finde das Vorkommen, das am besten zur aktuellen Auswahl passt
        if (occurrences.length > 0) {
          // Für jetzt nehmen wir das erste Vorkommen
          // In einer erweiterten Version könnte man die Position der Maus verwenden
          const { start, end } = occurrences[0]
          
          // Prüfe, ob diese Markierung bereits existiert oder überlappt
          const exists = highlights.some(h => 
            (h.start <= start && h.end > start) || // Überlappung am Anfang
            (h.start < end && h.end >= end) ||     // Überlappung am Ende
            (h.start >= start && h.end <= end)     // Vollständig enthalten
          )
          
          if (!exists) {
            setHistory(prev => [...prev, highlights])
            const newHighlight: Highlight = {
              id: `highlight-${Date.now()}-${Math.random()}`,
              start,
              end,
              text: selectedText
            }

            setHighlights(prev => [...prev, newHighlight])
          }
        }
      }
      setIsSelecting(false)
      selection?.removeAllRanges()
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

    // Sortiere Markierungen nach Start-Position
    const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start)
    
    const parts: React.ReactNode[] = []
    let lastIndex = 0

    sortedHighlights.forEach((highlight, index) => {
      // Text vor der Markierung
      if (highlight.start > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.slice(lastIndex, highlight.start)}
          </span>
        )
      }

      // Markierter Text
      parts.push(
        <span
          key={highlight.id}
          className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded cursor-pointer hover:bg-yellow-300 dark:hover:bg-yellow-700 transition-colors border border-yellow-300 dark:border-yellow-600"
          title={`Markierung entfernen: "${highlight.text}"`}
          onClick={() => removeHighlight(highlight.id)}
        >
          {highlight.text}
        </span>
      )

      lastIndex = highlight.end
    })

    // Restlicher Text nach der letzten Markierung
    if (lastIndex < text.length) {
      parts.push(
        <span key="text-end">
          {text.slice(lastIndex)}
        </span>
      )
    }

    return parts
  }

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
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={{ userSelect: 'text' }}
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
