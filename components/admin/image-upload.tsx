"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, X, Image as ImageIcon } from "lucide-react"
import { useRouter } from "next/navigation"

interface ImageUploadProps {
  existingImages: Array<{
    id: string
    url: string
    alt: string | null
  }>
  examId: string
  questionId: string
}

export default function ImageUpload({ 
  existingImages, 
  examId, 
  questionId 
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [url, setUrl] = useState("")
  const [alt, setAlt] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileUpload(files[0])
    }
  }, [])

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Bitte wählen Sie nur Bilddateien aus.')
      return
    }

    setUploading(true)
    
    try {
      // Erstelle FormData für den Upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('examId', examId)
      formData.append('questionId', questionId)

      // Upload zur API
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload fehlgeschlagen')
      }

      const result = await response.json()
      
      // Seite neu laden um Änderungen zu zeigen
      router.refresh()
      
    } catch (error) {
      console.error('Upload error:', error)
      alert('Fehler beim Hochladen der Datei. Bitte versuchen Sie es erneut.')
    } finally {
      setUploading(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFileUpload(files[0])
    }
  }

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (url && url.startsWith('http')) {
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('examId', examId)
        formData.append('qid', questionId)
        formData.append('url', url)
        formData.append('alt', alt)

        const response = await fetch('/api/admin/exams/attach-image-by-url', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          setUrl("")
          setAlt("")
          router.refresh()
        } else {
          alert('Fehler beim Hinzufügen des Bildes')
        }
      } catch (error) {
        console.error('Error adding image:', error)
        alert('Fehler beim Hinzufügen des Bildes')
      } finally {
        setUploading(false)
      }
    }
  }

  const handleRemoveImage = async (mediaId: string) => {
    try {
      const formData = new FormData()
      formData.append('examId', examId)
      formData.append('qid', questionId)
      formData.append('mid', mediaId)

      const response = await fetch('/api/admin/exams/remove-image', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        router.refresh()
      } else {
        alert('Fehler beim Entfernen des Bildes')
      }
    } catch (error) {
      console.error('Error removing image:', error)
      alert('Fehler beim Entfernen des Bildes')
    }
  }

  return (
    <div className="space-y-4">
      {/* Bestehende Bilder */}
      {existingImages.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Bereits hinzugefügte Bilder</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {existingImages.map((image) => (
              <div key={image.id} className="relative group border rounded-lg overflow-hidden">
                <img 
                  src={image.url} 
                  alt={image.alt || ""} 
                  className="w-full h-24 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveImage(image.id)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {image.alt && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
                    {image.alt}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload-Bereich */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Neue Bilder hinzufügen</Label>
        
        {/* Drag & Drop Bereich */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          
          <div className="space-y-2">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {uploading ? 'Wird hochgeladen...' : 'Bilder hierher ziehen oder klicken zum Auswählen'}
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, GIF bis 10MB
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Datei auswählen
            </Button>
          </div>
        </div>

        {/* URL-Eingabe */}
        <div className="border-t pt-4">
          <form onSubmit={handleUrlSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="image-url">Bild-URL</Label>
                <Input
                  id="image-url"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={uploading}
                />
              </div>
              <div>
                <Label htmlFor="image-alt">Alt-Text (optional)</Label>
                <Input
                  id="image-alt"
                  placeholder="Beschreibung des Bildes"
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  disabled={uploading}
                />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={!url || uploading}
              className="w-full sm:w-auto"
            >
              {uploading ? 'Wird hinzugefügt...' : 'Bild hinzufügen'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
