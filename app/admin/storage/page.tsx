// app/admin/storage/page.tsx
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface StorageInfo {
  totalUsers: number
  totalExams: number
  totalQuestions: number
  totalAttempts: number
  totalPurchases: number
  totalDecks: number
  totalAttemptAnswers: number
  totalTags: number
  totalSubscriptions: number
  databaseSize: string
  lastCleanup: string | null
}

export default function StoragePage() {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStorageInfo() {
      try {
        const response = await fetch("/api/admin/storage-info")
        if (!response.ok) {
          throw new Error("Failed to fetch storage info")
        }
        const data = await response.json()
        setStorageInfo(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchStorageInfo()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Speicherplatz</h1>
          <p className="text-muted-foreground">Lade Speicherplatz-Informationen...</p>
        </div>
        <div className="text-center py-8">Lädt...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Speicherplatz</h1>
          <p className="text-muted-foreground">Fehler beim Laden der Speicherplatz-Informationen</p>
        </div>
        <Alert>
          <AlertDescription className="text-red-600">
            Fehler: {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Speicherplatz</h1>
        <p className="text-muted-foreground">
          Übersicht über Datenbank-Nutzung und Speicherplatz
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              👥 User
              <Badge variant="outline">{storageInfo?.totalUsers || 0}</Badge>
            </CardTitle>
            <CardDescription>
              Registrierte Benutzer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gesamtanzahl der registrierten User in der Datenbank
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📝 Prüfungen
              <Badge variant="outline">{storageInfo?.totalExams || 0}</Badge>
            </CardTitle>
            <CardDescription>
              Verfügbare Prüfungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Anzahl der verfügbaren Prüfungen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ❓ Fragen
              <Badge variant="outline">{storageInfo?.totalQuestions || 0}</Badge>
            </CardTitle>
            <CardDescription>
              Gesamtanzahl Fragen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Alle Fragen in der Datenbank
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎯 Versuche
              <Badge variant="outline">{storageInfo?.totalAttempts || 0}</Badge>
            </CardTitle>
            <CardDescription>
              Abgeschlossene Prüfungsversuche
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Alle abgeschlossenen Prüfungsversuche
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💳 Käufe
              <Badge variant="outline">{storageInfo?.totalPurchases || 0}</Badge>
            </CardTitle>
            <CardDescription>
              Abgeschlossene Käufe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Alle abgeschlossenen Käufe und Aktivierungen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📚 Decks
              <Badge variant="outline">{storageInfo?.totalDecks || 0}</Badge>
            </CardTitle>
            <CardDescription>
              Erstellte Decks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Von Usern erstellte Prüfungsdecks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💬 Antworten
              <Badge variant="outline">{storageInfo?.totalAttemptAnswers || 0}</Badge>
            </CardTitle>
            <CardDescription>
              Gespeicherte Antworten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Alle User-Antworten in der Datenbank
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏷️ Tags
              <Badge variant="outline">{storageInfo?.totalTags || 0}</Badge>
            </CardTitle>
            <CardDescription>
              Verfügbare Tags
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Alle verfügbaren Frage-Tags
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              👑 Abonnements
              <Badge variant="outline">{storageInfo?.totalSubscriptions || 0}</Badge>
            </CardTitle>
            <CardDescription>
              Aktive Abonnements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Pro-Abonnements in der Datenbank
            </p>
          </CardContent>
        </Card>
      </div>

      {storageInfo?.databaseSize && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Datenbank-Größe</CardTitle>
            <CardDescription>
              Aktuelle Größe der Datenbank
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {storageInfo.databaseSize}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Geschätzte Größe der PostgreSQL-Datenbank
            </p>
          </CardContent>
        </Card>
      )}

      {storageInfo?.lastCleanup && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Letzte Bereinigung</CardTitle>
            <CardDescription>
              Wann wurde zuletzt aufgeräumt?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg">
              {new Date(storageInfo.lastCleanup).toLocaleDateString("de-DE", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
