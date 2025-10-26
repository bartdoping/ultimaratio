"use client"

import { useState, useEffect, useRef } from "react"

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
      
      // Prüfe, ob diese Markierung bereits existiert
      const exists = highlights.some(h => h.text === selectedText)
      
      if (!exists) {
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
    setHighlights(prev => prev.filter(h => h.id !== highlightId))
  }

  const renderTextWithHighlights = () => {
    if (highlights.length === 0) {
      return text
    }

    // Erstelle ein Array von Textteilen und Markierungen
    const parts: React.ReactNode[] = []
    let remainingText = text
    let lastIndex = 0

    // Sortiere Markierungen nach Position im Text
    const sortedHighlights = [...highlights].sort((a, b) => {
      const indexA = text.indexOf(a.text)
      const indexB = text.indexOf(b.text)
      return indexA - indexB
    })

    sortedHighlights.forEach((highlight, index) => {
      const highlightIndex = remainingText.indexOf(highlight.text)
      
      if (highlightIndex !== -1) {
        // Text vor der Markierung
        if (highlightIndex > 0) {
          parts.push(
            <span key={`text-${index}-before`}>
              {remainingText.slice(0, highlightIndex)}
            </span>
          )
        }

        // Markierter Text
        parts.push(
          <mark
            key={highlight.id}
            className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded cursor-pointer hover:bg-yellow-300 dark:hover:bg-yellow-700 transition-colors border border-yellow-300 dark:border-yellow-600"
            data-highlight-id={highlight.id}
            title="Klicken zum Entfernen"
            onClick={() => removeHighlight(highlight.id)}
          >
            {highlight.text}
          </mark>
        )

        // Aktualisiere remainingText für nächste Iteration
        remainingText = remainingText.slice(highlightIndex + highlight.text.length)
      }
    })

    // Restlicher Text nach der letzten Markierung
    if (remainingText.length > 0) {
      parts.push(
        <span key="text-end">
          {remainingText}
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