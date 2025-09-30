"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import NewQuestionImageUpload from "./new-question-image-upload"

interface NewQuestionFormProps {
  examId: string
}

export default function NewQuestionForm({ examId }: NewQuestionFormProps) {
  const [images, setImages] = useState<Array<{ url: string; alt: string }>>([])

  const handleImageAdd = (url: string, alt: string) => {
    setImages(prev => [...prev, { url, alt }])
  }

  const handleImageRemove = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      
      <div>
        <Label>Fragetext</Label>
        <textarea name="stem" className="input w-full h-24" placeholder="Frage…" required />
      </div>

      <div>
        <Label>Zusammenfassende Erläuterung</Label>
        <textarea name="explanation" className="input w-full h-24" placeholder="Erklärung zur Frage…" />
      </div>

      <div>
        <Label>Kommentar/Tipp</Label>
        <textarea name="tip" className="input w-full h-16" placeholder="Tipp oder Kommentar…" />
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="allowImmediate" /> Sofort-Feedback für diese Frage erlauben
      </label>

      {/* Bilder */}
      <NewQuestionImageUpload
        onImageAdd={handleImageAdd}
        onImageRemove={handleImageRemove}
        images={images}
      />

      {/* Antwortoptionen */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Antwortoptionen</div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <Label>Option {i + 1}</Label>
              <Input name={`option_${i}`} placeholder={`Antwort ${i + 1}…`} />
              <Label className="text-xs text-muted-foreground">Erklärung zu Option {i + 1} (optional)</Label>
              <Input name={`optionExp_${i}`} placeholder="Warum richtig/falsch?" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span>Korrekte Option:</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <label key={i} className="flex items-center gap-1">
            <input type="radio" name="correct" value={String(i)} defaultChecked={i === 0} /> {i + 1}
          </label>
        ))}
      </div>

      <Button type="submit">Frage anlegen</Button>
      
      {/* Versteckte Felder für Bilder */}
      {images.map((image, index) => (
        <div key={index}>
          <input type="hidden" name={`imageUrl_${index}`} value={image.url} />
          <input type="hidden" name={`imageAlt_${index}`} value={image.alt} />
        </div>
      ))}
    </div>
  )
}
