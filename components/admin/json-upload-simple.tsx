"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function JsonUploadSimple() {
  const handleFileUpload = () => {
    const fileInput = document.getElementById('json-file-input') as HTMLInputElement
    const file = fileInput?.files?.[0]
    if (!file) return
    
    if (!file.name.toLowerCase().endsWith('.json')) {
      alert('Bitte wählen Sie eine JSON-Datei aus.')
      return
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert('Datei ist zu groß. Maximum: 10MB')
      return
    }
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      try {
        const parsed = JSON.parse(text) // Validiere JSON

        // Akzeptiere zwei Formen:
        // A) { questions: [...] }
        // B) { cases: [...], questions: [...] }
        const hasQuestions = parsed && Array.isArray(parsed.questions)
        const hasCases = parsed && Array.isArray(parsed.cases)
        if (!hasQuestions) {
          alert('Ungültiges JSON: Feld "questions" fehlt oder ist kein Array.')
          return
        }

        // Sanity-Checks zu questions
        for (let i = 0; i < parsed.questions.length; i++) {
          const q = parsed.questions[i]
          if (!q || typeof q.stem !== 'string' || !Array.isArray(q.options)) {
            alert(`Ungültige Frage an Position ${i + 1}: "stem" oder "options" fehlen.`)
            return
          }
          if (q.options.length < 2) {
            alert(`Frage ${i + 1} hat weniger als 2 Optionen.`)
            return
          }
        }

        // Für Single-only (kein cases-Array): direkt übernehmen
        // Für Cases+Questions: ebenfalls direkt übernehmen – Server unterscheidet beim Import
        const textarea = document.querySelector('textarea[name="bulk"]') as HTMLTextAreaElement
        if (textarea) {
          textarea.value = JSON.stringify(
            hasCases ? { cases: parsed.cases, questions: parsed.questions } : { questions: parsed.questions },
            null,
            2
          )
          alert('JSON geprüft und in die Textbox eingefügt.')
        }
      } catch (e) {
        alert('Ungültiges JSON-Format')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="json-file-input" className="text-sm font-medium">
          JSON-Datei hochladen
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Wählen Sie eine JSON-Datei im gleichen Format wie die Textbox aus.
        </p>
      </div>

      <div className="space-y-2">
        <Input
          id="json-file-input"
          type="file"
          accept=".json,application/json"
          className="cursor-pointer"
        />
        
        <Button
          type="button"
          className="w-full"
          variant="outline"
          onClick={handleFileUpload}
        >
          📤 JSON hochladen
        </Button>
      </div>
    </div>
  )
}
