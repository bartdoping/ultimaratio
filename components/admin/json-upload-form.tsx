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

import { validateBulkJson as validateBulkJsonLib } from "@/lib/question-bulk-json"

type ValidateResult =
  | { ok: true; questionCount: number; caseCount: number; imageCount: number }
  | { ok: false; error: string }

function validateBulkJson(raw: string): ValidateResult {
  const result = validateBulkJsonLib(raw)
  if (!result.ok) return result
  return {
    ok: true,
    questionCount: result.questionCount,
    caseCount: result.caseCount,
    imageCount: result.imageCount,
  }
}

export default function JsonUploadForm({ examId, bulkImportAction }: JsonUploadFormProps) {
  const [jsonData, setJsonData] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: "" })
  const [promptCopied, setPromptCopied] = useState(false)
  const [dryRunLoading, setDryRunLoading] = useState(false)

  const handleDryRun = () => {
    setDryRunLoading(true)
    setResult(null)
    const checked = validateBulkJson(jsonData)
    if (!checked.ok) {
      setResult({ success: false, error: checked.error })
    } else {
      setResult({
        success: true,
        message: `Dry-Run OK: ${checked.questionCount} Fragen, ${checked.caseCount} mit Falltext, ${checked.imageCount} Bilder. Import kann gestartet werden.`,
      })
    }
    setDryRunLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setProgress({ current: 0, total: 0, stage: "Analysiere JSON..." })

    try {
      const checked = validateBulkJson(jsonData)
      if (!checked.ok) {
        setResult({ success: false, error: checked.error })
        return
      }

      const questionCount = checked.questionCount
      setProgress({ current: 0, total: questionCount, stage: "Bereite Import vor..." })

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
      setProgress({ current: questionCount, total: questionCount, stage: "Abgeschlossen!" })
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
        <div className="space-y-1">
          <Label htmlFor="bulk-json">Fragen-JSON</Label>
          <p className="text-xs text-muted-foreground">
            Erwartet ein Objekt mit <code>questions</code>. Falltexte kommen direkt als <code>caseVignette</code> an die jeweilige Frage.
          </p>
          <Textarea
            id="bulk-json"
            name="bulk"
            value={jsonData}
            onChange={(e) => setJsonData(e.target.value)}
            className="w-full h-64 font-mono text-xs"
            placeholder={`{
  "questions": [
    {
      "stem": "Was ist richtig?",
      "explanation": "So merkst du es dir …",
      "allowImmediate": true,
      "caseVignette": "Anamnese…",
      "images": [{ "url": "https://…/bild.jpg", "alt": "Röntgen" }],
      "options": [
        { "text": "Option A", "isCorrect": true, "explanation": "darum…" },
        { "text": "Option B", "isCorrect": false, "explanation": null },
        { "text": "Option C", "isCorrect": false, "explanation": null }
      ]
    }
  ]
}`}
          />
        </div>

        {/* KI-Prompt für JSON-Konvertierung */}
        <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">KI-Prompt für JSON-Konvertierung</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const promptText = `Du konvertierst medizinische Prüfungsfragen in ein JSON für **unsere Plattform**.\n\nWICHTIG:\n- Gib **ausschließlich** das finale JSON aus (keine Erklärungen, kein Markdown, keine Codefences).\n- Das JSON muss **parsebar** sein.\n- Verwende **nur** die definierten Keys. Keine zusätzlichen Felder.\n- Verwende **true/false** (keine \"yes/no\", keine Strings).\n\n====================\nZIELFORMAT (exakt)\n====================\nTop-Level: Objekt mit Pflichtfeld \"questions\".\n\n{\n  \"questions\": [\n    {\n      \"stem\": string,                  // Pflicht (nicht leer)\n      \"explanation\": string|null,      // optional\n      \"allowImmediate\": boolean,       // Pflicht\n      \"caseVignette\": string|null,     // optionaler Falltext; gleiche Texte bilden denselben Fall\n      \"images\": [                      // optional\n        { \"url\": string, \"alt\": string|null }\n      ],\n      \"options\": [                     // Pflicht: 2 bis 6 Elemente\n        { \"text\": string, \"isCorrect\": boolean, \"explanation\": string|null }\n      ]\n    }\n  ]\n}\n\n====================\nHARTE REGELN\n====================\n1) \"questions\" muss existieren und ein Array sein.\n2) Jede Frage hat:\n   - \"stem\" (nicht leer)\n   - \"allowImmediate\" (boolean)\n   - \"options\" (Array 2–6)\n3) Jede Option hat:\n   - \"text\" (nicht leer)\n   - \"isCorrect\" (boolean)\n   - optional \"explanation\" (string|null)\n4) Mindestens **eine** Option pro Frage muss \"isCorrect\": true haben.\n5) Fallfragen nur wenn nötig:\n   - Wenn ein Falltext vorhanden ist → als \"caseVignette\" direkt an der Frage setzen.\n   - Mehrere Fragen mit identischer \"caseVignette\" gehören zum selben Fall.\n6) Bilder nur wenn vorhanden:\n   - \"url\" muss mit http:// oder https:// beginnen.\n7) Keine IDs, keine Tags, keine examId.\n\n====================\nCHECKLISTE VOR AUSGABE\n====================\n- options-Länge je Frage 2–6?\n- mind. eine korrekte Option?\n- caseVignette nur bei echten Fallfragen?\n- JSON valide?\n\n====================\nBEISPIEL (minimal)\n====================\n{\n  \"questions\": [\n    {\n      \"stem\": \"Welche Aussage ist richtig?\",\n      \"explanation\": null,\n      \"allowImmediate\": true,\n      \"caseVignette\": null,\n      \"options\": [\n        { \"text\": \"Option A\", \"isCorrect\": true, \"explanation\": null },\n        { \"text\": \"Option B\", \"isCorrect\": false, \"explanation\": null }\n      ]\n    }\n  ]\n}\n\nJetzt konvertiere den folgenden Input in genau dieses Format:\n\n<<<INPUT>>>\n(HIER DEN FRAGENTEXT EINFÜGEN)\n<<<END INPUT>>>`
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
            Kopiere diesen Prompt in ein KI-Tool, um Rohmaterial in das passende Importformat umzuwandeln.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={dryRunLoading || loading || !jsonData.trim()}
            onClick={handleDryRun}
            className="flex-1"
          >
            {dryRunLoading ? "Prüfe..." : "JSON prüfen (Dry-Run)"}
          </Button>
          <Button type="submit" disabled={loading || !jsonData.trim()} className="flex-1">
            {loading ? "Importiere..." : "Fragen importieren"}
          </Button>
        </div>
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
          Hilfe bei Importfehlern anzeigen
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
