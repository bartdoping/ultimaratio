"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle } from "lucide-react"

interface JsonUploadFormProps {
  examId: string
  bulkImportAction: (formData: FormData) => Promise<{ success: boolean; message?: string; error?: string; examId?: string }>
}

export default function JsonUploadForm({ examId, bulkImportAction }: JsonUploadFormProps) {
  const [jsonData, setJsonData] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("examId", examId)
      formData.append("bulk", jsonData)

      const response = await bulkImportAction(formData)
      setResult(response)

      if (response.success) {
        setJsonData("") // Clear form on success
        // Optional: Reload page after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (error) {
      setResult({ success: false, error: "Unerwarteter Fehler beim Importieren" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="bulk-json">JSON-Daten</Label>
          <Textarea
            id="bulk-json"
            name="bulk"
            value={jsonData}
            onChange={(e) => setJsonData(e.target.value)}
            className="w-full h-64 font-mono text-xs"
            placeholder={`{
  "cases": [
    { "title": "Fall A", "vignette": "Anamnese…", "order": 1 }
  ],
  "questions": [
    {
      "stem": "Was ist richtig?",
      "tip": "Denke an …",
      "explanation": "So merkst du es dir …",
      "allowImmediate": true,
      "caseTitle": "Fall A",
      "images": [{ "url": "https://…/bild.jpg", "alt": "Röntgen" }],
      "options": [
        { "text": "Option A", "isCorrect": true, "explanation": "darum…" },
        { "text": "Option B" },
        { "text": "Option C" }
      ]
    }
  ]
}`}
          />
        </div>

        <Button type="submit" disabled={loading || !jsonData.trim()}>
          {loading ? "Importiere..." : "Generieren"}
        </Button>
      </form>

      {result && (
        <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <div className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
              {result.success ? result.message : result.error}
            </AlertDescription>
          </div>
        </Alert>
      )}
    </div>
  )
}
