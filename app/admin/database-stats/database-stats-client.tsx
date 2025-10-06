"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DatabaseStats {
  database: {
    size: string
    sizeBytes: number
    sizeMB: number
  }
  tables: Array<{
    tablename: string
    size: string
    size_bytes: number
  }>
  counts: {
    users: number
    questions: number
    attempts: number
  }
  limits: {
    freeTier: string
    currentUsage: string
    percentage: number
  }
}

export default function DatabaseStatsClient() {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/database-stats")
      const data = await response.json()

      if (data.error) {
        setError(data.message || "Fehler beim Laden der Statistiken")
      } else {
        setStats(data)
      }
    } catch (err) {
      setError("Netzwerkfehler beim Laden der Statistiken")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Lade Datenbank-Statistiken...</div>
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">❌ {error}</div>
        <button 
          onClick={fetchStats}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  if (!stats) {
    return <div className="text-center py-8">Keine Daten verfügbar</div>
  }

  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return "bg-green-500"
    if (percentage < 80) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="space-y-6">
      {/* Übersicht */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Speicherverbrauch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.database.size}</div>
            <div className="text-sm text-muted-foreground">
              {stats.limits.currentUsage} von {stats.limits.freeTier}
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getUsageColor(stats.limits.percentage)}`}
                  style={{ width: `${Math.min(stats.limits.percentage, 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.limits.percentage.toFixed(1)}% verwendet
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.counts.users}</div>
            <div className="text-sm text-muted-foreground">Registrierte Accounts</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fragen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.counts.questions}</div>
            <div className="text-sm text-muted-foreground">Im System</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabellen-Details */}
      <Card>
        <CardHeader>
          <CardTitle>Tabellen-Größen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.tables.map((table, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">{table.tablename}</span>
                <Badge variant="outline">{table.size}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Warnung bei hohem Verbrauch */}
      {stats.limits.percentage > 80 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-red-800 dark:text-red-200">
              ⚠️ Speicher-Warnung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 dark:text-red-300">
              Du hast bereits {stats.limits.percentage.toFixed(1)}% deines kostenlosen Speichers verwendet.
              Bei 100% wird die Datenbank schreibgeschützt.
            </p>
            <div className="mt-4">
              <Badge variant="destructive">
                Upgrade zu Neon Pro empfohlen ($19/Monat)
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
