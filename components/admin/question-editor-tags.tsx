"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import QuestionTagEditor from "./question-tag-editor"

interface QuestionEditorTagsProps {
  questionId: string
  className?: string
}

export default function QuestionEditorTags({
  questionId,
  className = ""
}: QuestionEditorTagsProps) {
  const [tags, setTags] = useState<any[]>([])

  const handleTagsChange = (newTags: any[]) => {
    setTags(newTags)
  }

  return (
    <div className={className}>
      <QuestionTagEditor
        questionId={questionId}
        onTagsChange={handleTagsChange}
      />
    </div>
  )
}
