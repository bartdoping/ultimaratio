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
        JSON.parse(text) // Validiere JSON
        const textarea = document.querySelector('textarea[name="bulk"]') as HTMLTextAreaElement
        if (textarea) {
          textarea.value = text
        }
      } catch {
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
