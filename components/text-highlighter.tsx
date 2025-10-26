"use client"

import { useState, useEffect, useRef } from "react"

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
  const textRef = useRef<HTMLDivElement>(null)

  // Lade gespeicherte Markierungen für diese Frage
  useEffect(() => {
    const savedHighlights = localStorage.getItem(`highlights-${questionId}`)
    if (savedHighlights) {
      try {
        const parsed = JSON.parse(savedHighlights)
        setHighlights(parsed)
      } catch (error) {
        console.error('Fehler beim Laden der Markierungen:', error)
      }
    } else {
      setHighlights([])
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
      
      // Berechne die Position im ursprünglichen Text
      const range = selection.getRangeAt(0)
      const preRange = document.createRange()
      preRange.setStart(textRef.current!.firstChild!, 0)
      preRange.setEnd(range.startContainer, range.startOffset)
      
      // Zähle nur die sichtbaren Zeichen (ohne HTML-Tags)
      const preText = preRange.toString()
      const start = preText.length
      const end = start + selectedText.length
      
      // Prüfe, ob diese Markierung bereits existiert oder überlappt
      const exists = highlights.some(h => 
        (h.start <= start && h.end > start) || // Überlappung am Anfang
        (h.start < end && h.end >= end) ||     // Überlappung am Ende
        (h.start >= start && h.end <= end)     // Vollständig enthalten
      )
      
      if (!exists && start >= 0 && end <= text.length) {
        const newHighlight: Highlight = {
          id: `highlight-${Date.now()}-${Math.random()}`,
          start,
          end,
          text: selectedText
        }

        setHighlights(prev => [...prev, newHighlight])
      }
      
      selection.removeAllRanges()
    }
  }

  const removeHighlight = (highlightId: string) => {
    setHighlights(prev => prev.filter(h => h.id !== highlightId))
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
        <mark
          key={highlight.id}
          className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded cursor-pointer hover:bg-yellow-300 dark:hover:bg-yellow-700 transition-colors border border-yellow-300 dark:border-yellow-600"
          title="Klicken zum Entfernen"
          onClick={() => removeHighlight(highlight.id)}
        >
          {highlight.text}
        </mark>
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
    <div>
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
    </div>
  )
}