"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText, AlertCircle } from "lucide-react"

interface JsonUploadProps {
  examId: string
  onUpload: (jsonData: string) => void
}

export default function JsonUpload({ examId, onUpload }: JsonUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Prüfe Dateityp
    if (!selectedFile.name.toLowerCase().endsWith('.json')) {
      setError("Bitte wählen Sie eine JSON-Datei aus.")
      setFile(null)
      return
    }

    // Prüfe Dateigröße (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("Datei ist zu groß. Maximum: 10MB")
      setFile(null)
      return
    }

    setFile(selectedFile)
    setError(null)
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const text = await file.text()
      
      // Validiere JSON
      let jsonData
      try {
        jsonData = JSON.parse(text)
      } catch (parseError) {
        throw new Error("Ungültiges JSON-Format")
      }

      // Validiere Struktur
      if (!jsonData.questions || !Array.isArray(jsonData.questions)) {
        throw new Error("JSON muss 'questions' Array enthalten")
      }

      if (jsonData.questions.length === 0) {
        throw new Error("Keine Fragen in der JSON-Datei gefunden")
      }

      // Validiere mindestens eine Frage
      const firstQuestion = jsonData.questions[0]
      if (!firstQuestion.stem || typeof firstQuestion.stem !== 'string') {
        throw new Error("Fragen müssen 'stem' (Fragestellung) enthalten")
      }

      if (!firstQuestion.options || !Array.isArray(firstQuestion.options)) {
        throw new Error("Fragen müssen 'options' Array enthalten")
      }

      if (firstQuestion.options.length < 2) {
        throw new Error("Jede Frage muss mindestens 2 Optionen haben")
      }

      // JSON an Parent-Komponente weiterleiten
      onUpload(text)
      
      // Reset
      setFile(null)
      const fileInput = document.getElementById('json-file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''

    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Verarbeiten der Datei")
    } finally {
      setUploading(false)
    }
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
          onChange={handleFileChange}
          className="cursor-pointer"
        />
        
        {file && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <FileText className="h-4 w-4" />
            <span>{file.name}</span>
            <span className="text-muted-foreground">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
          variant="outline"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Verarbeite..." : "JSON hochladen"}
        </Button>
      </div>
    </div>
  )
}
