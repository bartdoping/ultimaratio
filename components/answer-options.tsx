"use client"

import { useState } from "react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

type Option = { 
  id: string
  text: string
  isCorrect: boolean
  explanation?: string | null
}

type AnswerOptionsProps = {
  options: Option[]
  selectedOptionId?: string
  onSelect: (optionId: string) => void
  showFeedback?: boolean
  submitting?: boolean
}

export function AnswerOptions({ 
  options, 
  selectedOptionId, 
  onSelect, 
  showFeedback = false,
  submitting = false 
}: AnswerOptionsProps) {
  const [strikethroughOptions, setStrikethroughOptions] = useState<Set<string>>(new Set())

  const toggleStrikethrough = (optionId: string) => {
    setStrikethroughOptions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(optionId)) {
        newSet.delete(optionId)
      } else {
        newSet.add(optionId)
      }
      return newSet
    })
  }

  const handleOptionClick = (optionId: string) => {
    // Nur durchstreichen, nicht auswählen
    toggleStrikethrough(optionId)
  }

  const handleRadioClick = (optionId: string, event: React.MouseEvent) => {
    // Radio Button Klick - Option auswählen
    event.stopPropagation()
    onSelect(optionId)
  }

  return (
    <RadioGroup 
      value={selectedOptionId || ""} 
      onValueChange={onSelect}
      className="rounded-lg border overflow-hidden divide-y"
    >
      {options.map((option) => {
        const isSelected = selectedOptionId === option.id
        const isStrikethrough = strikethroughOptions.has(option.id)
        const canShowFeedback = showFeedback && isSelected

        return (
          <div 
            key={option.id} 
            className={`flex items-start gap-3 px-3 py-2 transition-colors ${
              isSelected
                ? "bg-blue-50 dark:bg-blue-950/20"
                : "bg-background hover:bg-muted/50"
            } ${isStrikethrough ? "opacity-60" : ""}`}
          >
            {/* Radio Button */}
            <div 
              className="mt-0.5 cursor-pointer scale-110"
              onClick={(e) => handleRadioClick(option.id, e)}
            >
              <RadioGroupItem 
                value={option.id} 
                id={option.id}
                disabled={submitting}
                className="cursor-pointer"
              />
            </div>

            {/* Option Text */}
            <Label 
              htmlFor={option.id}
              className={`flex-1 cursor-pointer select-none text-base ${
                isStrikethrough ? 'line-through text-muted-foreground' : ''
              }`}
              onClick={(e) => {
                e.preventDefault()
                handleOptionClick(option.id)
              }}
            >
              <div className="space-y-1.5">
                <div className="flex items-start gap-3">
                  <span className={isStrikethrough ? 'line-through' : ''}>
                    {option.text}
                  </span>
                  {canShowFeedback && (
                    <span className={`text-base font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${
                      option.isCorrect 
                        ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30' 
                        : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30'
                    }`}>
                      {option.isCorrect ? '✓ Richtig' : '✗ Falsch'}
                    </span>
                  )}
                </div>
                
                {/* Erklärung anzeigen wenn Feedback aktiv und Option ausgewählt */}
                {canShowFeedback && option.explanation && (
                  <div className="text-sm text-muted-foreground mt-2 p-2 bg-muted/30 rounded-md border-l-4 border-blue-500">
                    {option.explanation}
                  </div>
                )}
              </div>
            </Label>
          </div>
        )
      })}
    </RadioGroup>
  )
}
