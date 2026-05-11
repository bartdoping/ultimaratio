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
      <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
        <div>
          <h4 className="font-medium">Frage und Erläuterung</h4>
          <p className="text-xs text-muted-foreground">
            Lege hier eine einzelne Frage an. Tags kannst du nach dem Speichern direkt im Editor zuweisen.
          </p>
        </div>

        <div className="space-y-1">
          <Label>Fragestellung</Label>
          <textarea
            name="stem"
            className="input w-full h-28"
            placeholder="Formuliere die Frage so, wie sie später in der Prüfung erscheinen soll..."
            required
          />
        </div>

        <div className="space-y-1">
          <Label>Zusammenfassende Erläuterung</Label>
          <textarea
            name="explanation"
            className="input w-full h-24"
            placeholder="Optional: kurze Erklärung, die nach der Bearbeitung angezeigt wird..."
          />
        </div>
      </div>

      {/* Bilder */}
      <div className="rounded-lg border bg-muted/20 p-4">
        <NewQuestionImageUpload
          onImageAdd={handleImageAdd}
          onImageRemove={handleImageRemove}
          images={images}
        />
      </div>

      {/* Antwortoptionen */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
        <div>
          <h4 className="font-medium">Antwortoptionen</h4>
          <p className="text-xs text-muted-foreground">
            Mindestens zwei Optionen ausfüllen. Leere Optionen werden ignoriert.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-md border bg-background p-3 space-y-2">
              <Label>Option {i + 1}</Label>
              <Input name={`option_${i}`} placeholder={`Antwort ${i + 1}`} />
              <Label className="text-xs text-muted-foreground">Erklärung zu Option {i + 1} (optional)</Label>
              <Input name={`optionExp_${i}`} placeholder="Warum richtig/falsch?" />
            </div>
          ))}
        </div>

        <div className="rounded-md border bg-background p-3">
          <div className="mb-2 text-sm font-medium">Korrekte Option</div>
          <div className="flex flex-wrap gap-2 text-sm">
            {[0, 1, 2, 3, 4].map((i) => (
              <label key={i} className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50">
                <input type="radio" name="correct" value={String(i)} defaultChecked={i === 0} />
                Option {i + 1}
              </label>
            ))}
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full sm:w-auto">Frage anlegen</Button>
      
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
