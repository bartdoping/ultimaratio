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
      className="space-y-2"
    >
      {options.map((option) => {
        const isSelected = selectedOptionId === option.id
        const isStrikethrough = strikethroughOptions.has(option.id)
        const canShowFeedback = showFeedback && isSelected

        return (
          <div key={option.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            {/* Radio Button */}
            <div 
              className="mt-1 cursor-pointer"
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
              className={`flex-1 cursor-pointer select-none ${
                isStrikethrough ? 'line-through text-muted-foreground' : ''
              }`}
              onClick={(e) => {
                e.preventDefault()
                handleOptionClick(option.id)
              }}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={isStrikethrough ? 'line-through' : ''}>
                    {option.text}
                  </span>
                  {canShowFeedback && (
                    <span className={`text-xs font-medium ${
                      option.isCorrect ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {option.isCorrect ? '✓ richtig' : '✗ falsch'}
                    </span>
                  )}
                </div>
                
                {/* Erklärung anzeigen wenn Feedback aktiv und Option ausgewählt */}
                {canShowFeedback && option.explanation && (
                  <div className="text-sm text-muted-foreground mt-2 p-2 bg-muted/30 rounded">
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
