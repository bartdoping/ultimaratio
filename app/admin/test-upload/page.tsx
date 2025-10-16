"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function TestUploadPage() {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('examId', 'test')
      formData.append('questionId', 'test')

      console.log('Sending upload request...')
      
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      })

      console.log('Response status:', response.status)
      
      const result = await response.json()
      console.log('Response data:', result)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.error || result.details || 'Unknown error'}`)
      }
      
      if (!result.success) {
        throw new Error(result.error || result.details || 'Upload failed')
      }
      
      setResult(result)
      
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Upload Test (ohne Screenshot-Schutz)</h1>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="file">Bild auswählen</Label>
          <Input 
            id="file"
            type="file" 
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </div>
        
        {uploading && (
          <div className="text-blue-600">Upload läuft...</div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <h3 className="font-semibold text-red-800">Fehler:</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        {result && (
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <h3 className="font-semibold text-green-800">Erfolg:</h3>
            <pre className="text-green-700 text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <h3 className="font-semibold text-yellow-800">Debug-Info:</h3>
          <p className="text-yellow-700 text-sm">
            Öffne die Browser-Entwicklertools (F12) und schaue in die Konsole für detaillierte Logs.
          </p>
        </div>
      </div>
    </div>
  )
}
