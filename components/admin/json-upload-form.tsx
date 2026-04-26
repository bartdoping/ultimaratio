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
      // Minimal-Validierung: verhindert kaputte Imports durch KI-Ausgaben
      if (!data || typeof data !== "object") {
        setResult({ success: false, error: 'Ungültiges JSON: Top-Level muss ein Objekt sein.' })
        return
      }
      if (!Array.isArray((data as any).questions)) {
        setResult({ success: false, error: 'Ungültiges JSON: Feld "questions" fehlt oder ist kein Array.' })
        return
      }

      const cases = Array.isArray((data as any).cases) ? (data as any).cases : []
      for (let i = 0; i < cases.length; i++) {
        const c = cases[i]
        if (!c || typeof c !== "object") {
          setResult({ success: false, error: `Ungültiger Fall an Position ${i + 1}: muss ein Objekt sein.` })
          return
        }
        if (typeof c.title !== "string" || !c.title.trim()) {
          setResult({ success: false, error: `Ungültiger Fall an Position ${i + 1}: "title" fehlt oder ist leer.` })
          return
        }
        if (c.vignette != null && typeof c.vignette !== "string") {
          setResult({ success: false, error: `Ungültiger Fall an Position ${i + 1}: "vignette" muss string oder null sein.` })
          return
        }
        if (c.order != null && typeof c.order !== "number") {
          setResult({ success: false, error: `Ungültiger Fall an Position ${i + 1}: "order" muss number sein.` })
          return
        }
      }

      const questions = (data as any).questions as any[]
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        if (!q || typeof q !== "object") {
          setResult({ success: false, error: `Ungültige Frage an Position ${i + 1}: muss ein Objekt sein.` })
          return
        }
        if (typeof q.stem !== "string" || !q.stem.trim()) {
          setResult({ success: false, error: `Ungültige Frage ${i + 1}: "stem" fehlt oder ist leer.` })
          return
        }
        if (typeof q.allowImmediate !== "boolean") {
          setResult({ success: false, error: `Ungültige Frage ${i + 1}: "allowImmediate" muss boolean sein.` })
          return
        }
        if (q.tip != null && typeof q.tip !== "string") {
          setResult({ success: false, error: `Ungültige Frage ${i + 1}: "tip" muss string oder null sein.` })
          return
        }
        if (q.explanation != null && typeof q.explanation !== "string") {
          setResult({ success: false, error: `Ungültige Frage ${i + 1}: "explanation" muss string oder null sein.` })
          return
        }
        if (q.caseTitle != null && typeof q.caseTitle !== "string") {
          setResult({ success: false, error: `Ungültige Frage ${i + 1}: "caseTitle" muss string oder null sein.` })
          return
        }
        if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
          setResult({ success: false, error: `Ungültige Frage ${i + 1}: "options" muss ein Array mit 2 bis 6 Elementen sein.` })
          return
        }
        let hasCorrect = false
        for (let j = 0; j < q.options.length; j++) {
          const o = q.options[j]
          if (!o || typeof o !== "object") {
            setResult({ success: false, error: `Ungültige Frage ${i + 1}: Option ${j + 1} muss ein Objekt sein.` })
            return
          }
          if (typeof o.text !== "string" || !o.text.trim()) {
            setResult({ success: false, error: `Ungültige Frage ${i + 1}: Option ${j + 1} "text" fehlt oder ist leer.` })
            return
          }
          if (typeof o.isCorrect !== "boolean") {
            setResult({ success: false, error: `Ungültige Frage ${i + 1}: Option ${j + 1} "isCorrect" muss boolean sein.` })
            return
          }
          if (o.explanation != null && typeof o.explanation !== "string") {
            setResult({ success: false, error: `Ungültige Frage ${i + 1}: Option ${j + 1} "explanation" muss string oder null sein.` })
            return
          }
          if (o.isCorrect) hasCorrect = true
        }
        if (!hasCorrect) {
          setResult({ success: false, error: `Ungültige Frage ${i + 1}: Mindestens eine Option muss "isCorrect": true haben.` })
          return
        }

        if (q.images != null) {
          if (!Array.isArray(q.images)) {
            setResult({ success: false, error: `Ungültige Frage ${i + 1}: "images" muss ein Array sein.` })
            return
          }
          for (let k = 0; k < q.images.length; k++) {
            const img = q.images[k]
            if (!img || typeof img !== "object") {
              setResult({ success: false, error: `Ungültige Frage ${i + 1}: Bild ${k + 1} muss ein Objekt sein.` })
              return
            }
            if (typeof img.url !== "string" || !/^https?:\/\//.test(img.url)) {
              setResult({ success: false, error: `Ungültige Frage ${i + 1}: Bild ${k + 1} "url" muss mit http:// oder https:// beginnen.` })
              return
            }
            if (img.alt != null && typeof img.alt !== "string") {
              setResult({ success: false, error: `Ungültige Frage ${i + 1}: Bild ${k + 1} "alt" muss string oder null sein.` })
              return
            }
          }
        }
      }

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
                const promptText = `Du konvertierst medizinische Prüfungsfragen in ein JSON für **unsere Plattform**.\n\nWICHTIG:\n- Gib **ausschließlich** das finale JSON aus (keine Erklärungen, kein Markdown, keine Codefences).\n- Das JSON muss **parsebar** sein.\n- Verwende **nur** die definierten Keys. Keine zusätzlichen Felder.\n- Verwende **true/false** (keine \"yes/no\", keine Strings).\n\n====================\nZIELFORMAT (exakt)\n====================\nTop-Level: Objekt mit optional \"cases\" und Pflicht \"questions\".\n\n{\n  \"cases\": [\n    {\n      \"title\": string,                 // Pflicht, eindeutig\n      \"vignette\": string|null,         // optional\n      \"order\": number                  // optional; wenn vorhanden: 1,2,3…\n    }\n  ],\n  \"questions\": [\n    {\n      \"stem\": string,                  // Pflicht (nicht leer)\n      \"tip\": string|null,              // optional\n      \"explanation\": string|null,      // optional\n      \"allowImmediate\": boolean,       // Pflicht\n      \"caseTitle\": string|null,        // optional; muss exakt cases[].title matchen\n      \"images\": [                      // optional\n        { \"url\": string, \"alt\": string|null }\n      ],\n      \"options\": [                     // Pflicht: 2 bis 6 Elemente\n        { \"text\": string, \"isCorrect\": boolean, \"explanation\": string|null }\n      ]\n    }\n  ]\n}\n\n====================\nHARTE REGELN\n====================\n1) \"questions\" muss existieren und ein Array sein.\n2) Jede Frage hat:\n   - \"stem\" (nicht leer)\n   - \"allowImmediate\" (boolean)\n   - \"options\" (Array 2–6)\n3) Jede Option hat:\n   - \"text\" (nicht leer)\n   - \"isCorrect\" (boolean)\n   - optional \"explanation\" (string|null)\n4) Mindestens **eine** Option pro Frage muss \"isCorrect\": true haben.\n5) Fälle nur wenn nötig:\n   - Wenn Fallvignette vorhanden → in \"cases\" aufnehmen.\n   - Dann muss jede Fallfrage \"caseTitle\" exakt auf cases[].title setzen.\n6) Bilder nur wenn vorhanden:\n   - \"url\" muss mit http:// oder https:// beginnen.\n7) Keine IDs, keine Tags, keine examId.\n\n====================\nCHECKLISTE VOR AUSGABE\n====================\n- options-Länge je Frage 2–6?\n- mind. eine korrekte Option?\n- caseTitle korrekt gematcht?\n- JSON valide?\n\n====================\nBEISPIEL (minimal)\n====================\n{\n  \"questions\": [\n    {\n      \"stem\": \"Welche Aussage ist richtig?\",\n      \"tip\": null,\n      \"explanation\": null,\n      \"allowImmediate\": true,\n      \"caseTitle\": null,\n      \"options\": [\n        { \"text\": \"Option A\", \"isCorrect\": true, \"explanation\": null },\n        { \"text\": \"Option B\", \"isCorrect\": false, \"explanation\": null }\n      ]\n    }\n  ]\n}\n\nJetzt konvertiere den folgenden Input in genau dieses Format:\n\n<<<INPUT>>>\n(HIER DEN FRAGENTEXT EINFÜGEN)\n<<<END INPUT>>>`
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
