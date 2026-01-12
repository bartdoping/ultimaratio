"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Copy, Check } from "lucide-react"

interface JsonUploadFormProps {
  examId: string
  bulkImportAction: (formData: FormData) => Promise<{ success: boolean; message?: string; error?: string; examId?: string }>
}

export default function JsonUploadForm({ examId, bulkImportAction }: JsonUploadFormProps) {
  const [jsonData, setJsonData] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: "" })
  const [promptCopied, setPromptCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setProgress({ current: 0, total: 0, stage: "Analysiere JSON..." })

    try {
      // Analysiere JSON um Anzahl zu bestimmen
      const data = JSON.parse(jsonData)
      const questionCount = Array.isArray(data?.questions) ? data.questions.length : 0
      const caseCount = Array.isArray(data?.cases) ? data.cases.length : 0
      
      setProgress({ current: 0, total: questionCount + caseCount, stage: "Bereite Import vor..." })

      const formData = new FormData()
      formData.append("examId", examId)
      formData.append("bulk", jsonData)

      // Simuliere Fortschritt während der Verarbeitung
      const progressInterval = setInterval(() => {
        setProgress(prev => ({
          ...prev,
          current: Math.min(prev.current + 1, prev.total),
          stage: prev.current < prev.total ? "Importiere Fragen..." : "Finalisiere..."
        }))
      }, 200)

      const response = await bulkImportAction(formData)
      
      clearInterval(progressInterval)
      setProgress({ current: questionCount + caseCount, total: questionCount + caseCount, stage: "Abgeschlossen!" })
      setResult(response)

      if (response.success) {
        setJsonData("") // Clear form on success
        // Optional: Reload page after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (error) {
      console.error("JSON Upload Error:", error)
      setResult({ success: false, error: `Unerwarteter Fehler: ${error}` })
    } finally {
      setLoading(false)
      setProgress({ current: 0, total: 0, stage: "" })
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

        {/* KI-Prompt für JSON-Konvertierung */}
        <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">🤖 KI-Prompt für JSON-Konvertierung</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const promptText = `Du bist ein Experte für die Konvertierung von medizinischen Prüfungsfragen in ein strukturiertes JSON-Format. Deine Aufgabe ist es, beliebige Prüfungsfragen (Einzelfragen, Fallfragen oder eine Mischung aus beiden) in das folgende exakte JSON-Format zu konvertieren.

## JSON-Format-Spezifikation:

Das JSON-Objekt muss folgende Struktur haben:

\`\`\`json
{
  "cases": [
    {
      "title": "Titel des Falls (Pflicht)",
      "vignette": "Vollständiger Falltext mit Anamnese, Befunden, etc. (Optional)",
      "order": 1
    }
  ],
  "questions": [
    {
      "stem": "Vollständiger Fragetext (Pflicht)",
      "tip": "Tipp oder Kommentar zur Frage (Optional)",
      "explanation": "Zusammenfassende Erläuterung zur gesamten Frage (Optional)",
      "allowImmediate": true,
      "caseTitle": "Titel des zugehörigen Falls (Nur wenn Frage zu einem Fall gehört)",
      "images": [
        {
          "url": "https://vollständige-url-zum-bild.jpg",
          "alt": "Beschreibung des Bildes"
        }
      ],
      "options": [
        {
          "text": "Vollständiger Text der Antwortoption (Pflicht)",
          "isCorrect": true,
          "explanation": "Erklärung, warum diese Option richtig/falsch ist (Optional)"
        }
      ]
    }
  ]
}
\`\`\`

## Wichtige Regeln:

1. **Fälle (cases)**: 
   - Nur erforderlich, wenn Fallfragen vorhanden sind
   - Jeder Fall benötigt einen eindeutigen "title"
   - "vignette" enthält den vollständigen Falltext
   - "order" bestimmt die Reihenfolge (beginnend bei 1)

2. **Fragen (questions)**:
   - "stem" ist PFLICHT und enthält die vollständige Fragestellung
   - "caseTitle" muss exakt mit dem "title" eines Falls übereinstimmen, wenn die Frage zu einem Fall gehört
   - "allowImmediate" ist ein Boolean (true/false) für Sofort-Feedback
   - Jede Frage benötigt mindestens 2, maximal 6 Optionen

3. **Antwortoptionen (options)**:
   - "text" ist PFLICHT
   - "isCorrect" ist ein Boolean (true/false) - mindestens eine Option muss "isCorrect": true haben
   - "explanation" ist optional und erklärt, warum die Option richtig oder falsch ist

4. **Bilder (images)**:
   - Nur wenn Bilder vorhanden sind
   - "url" muss eine vollständige HTTP/HTTPS-URL sein
   - "alt" ist eine Beschreibung des Bildes

## Beispiele:

### Beispiel 1: Einzelfrage ohne Fall
\`\`\`json
{
  "questions": [
    {
      "stem": "Welche Aussage zur Hypertonie ist richtig?",
      "tip": "Denke an die WHO-Klassifikation",
      "explanation": "Die Hypertonie wird nach WHO-Kriterien eingeteilt...",
      "allowImmediate": true,
      "options": [
        {
          "text": "Ein systolischer Blutdruck >140 mmHg definiert eine Hypertonie",
          "isCorrect": true,
          "explanation": "Nach WHO-Kriterien liegt eine Hypertonie ab 140/90 mmHg vor"
        },
        {
          "text": "Ein diastolischer Blutdruck >90 mmHg ist immer behandlungsbedürftig",
          "isCorrect": false,
          "explanation": "Die Behandlungsindikation hängt von weiteren Faktoren ab"
        },
        {
          "text": "Eine Hypertonie liegt nur bei Werten >160/100 mmHg vor",
          "isCorrect": false
        }
      ]
    }
  ]
}
\`\`\`

### Beispiel 2: Fallfrage
\`\`\`json
{
  "cases": [
    {
      "title": "Fall: 45-jähriger Patient mit Brustschmerzen",
      "vignette": "Ein 45-jähriger Patient stellt sich in der Notaufnahme vor. Seit 2 Stunden bestehen retrosternale, drückende Schmerzen, die in den linken Arm ausstrahlen. EKG zeigt ST-Hebungen in Ableitung II, III, aVF.",
      "order": 1
    }
  ],
  "questions": [
    {
      "stem": "Welche Diagnose ist am wahrscheinlichsten?",
      "caseTitle": "Fall: 45-jähriger Patient mit Brustschmerzen",
      "allowImmediate": false,
      "options": [
        {
          "text": "Akuter Myokardinfarkt",
          "isCorrect": true,
          "explanation": "ST-Hebungen in den inferioren Ableitungen sind typisch für einen STEMI"
        },
        {
          "text": "Angina pectoris",
          "isCorrect": false,
          "explanation": "Bei Angina pectoris sind keine ST-Hebungen zu erwarten"
        },
        {
          "text": "Lungenembolie",
          "isCorrect": false
        }
      ]
    }
  ]
}
\`\`\`

### Beispiel 3: Mischung aus Einzelfragen und Fallfragen
\`\`\`json
{
  "cases": [
    {
      "title": "Fall A: Notfall",
      "vignette": "Patient mit akuten Bauchschmerzen...",
      "order": 1
    }
  ],
  "questions": [
    {
      "stem": "Was ist eine Einzelfrage ohne Fall?",
      "allowImmediate": true,
      "options": [
        { "text": "Option 1", "isCorrect": true },
        { "text": "Option 2", "isCorrect": false }
      ]
    },
    {
      "stem": "Was ist eine Frage zum Fall?",
      "caseTitle": "Fall A: Notfall",
      "allowImmediate": false,
      "options": [
        { "text": "Option A", "isCorrect": true },
        { "text": "Option B", "isCorrect": false }
      ]
    }
  ]
}
\`\`\`

## Deine Aufgabe:

Konvertiere die folgenden Prüfungsfragen in das oben beschriebene JSON-Format. Stelle sicher, dass:
- Alle Pflichtfelder vorhanden sind
- Das JSON gültig und wohlgeformt ist
- Falltitel exakt übereinstimmen (caseTitle in questions = title in cases)
- Mindestens eine Option pro Frage als "isCorrect": true markiert ist
- Alle Texte vollständig und ungekürzt übernommen werden
- Optional Felder nur verwendet werden, wenn entsprechende Informationen vorhanden sind

Beginne mit der Konvertierung:`
                navigator.clipboard.writeText(promptText)
                setPromptCopied(true)
                setTimeout(() => setPromptCopied(false), 2000)
              }}
              className="h-8"
            >
              {promptCopied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Kopiert!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Prompt kopieren
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Kopiere diesen Prompt und füge ihn in eine KI (ChatGPT, Claude, etc.) ein. Die KI wird dann beliebige Prüfungsfragen automatisch in das korrekte JSON-Format konvertieren.
          </p>
        </div>

        <Button type="submit" disabled={loading || !jsonData.trim()}>
          {loading ? "Importiere..." : "Generieren"}
        </Button>
      </form>

      {/* Fortschrittsanzeige */}
      {loading && progress.total > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{progress.stage}</span>
            <span>{progress.current}/{progress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

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

      {/* Debug-Informationen */}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground">
          🔍 Debug-Informationen anzeigen
        </summary>
        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
          <p><strong>Wo findest du Fehlermeldungen:</strong></p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li><strong>Browser-Konsole:</strong> F12 → Console Tab</li>
            <li><strong>Server-Logs:</strong> Vercel Dashboard → Functions → Logs</li>
            <li><strong>UI-Feedback:</strong> Rote/grüne Alert-Boxen oben</li>
          </ol>
          <p className="mt-2"><strong>Hinweis:</strong> Detaillierte Server-Logs findest du in der Vercel-Konsole.</p>
        </div>
      </details>
    </div>
  )
}
