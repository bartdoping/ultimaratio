"use client"

import { useEffect, useState } from "react"
import { CircleChart } from "@/components/ui/circle-chart"

interface DashboardStats {
  score: {
    percentage: number
    correct: number
    incorrect: number
    unanswered: number
    total: number
  }
  questionBank: {
    percentage: number
    used: number
    unused: number
    total: number
  }
  tests: {
    total: number
    finished: number
    unfinished: number
  }
}

function StatLine({
  label,
  value,
  className = "",
}: {
  label: string
  value: number
  className?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-muted/40 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-semibold ${className}`}>{value}</span>
    </div>
  )
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/dashboard/stats")
        
        if (!response.ok) {
          throw new Error("Failed to fetch stats")
        }
        
        const data = await response.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((item) => (
          <div key={item} className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="h-28 w-28 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                <div className="h-4 w-full rounded bg-muted animate-pulse" />
                <div className="h-4 w-4/5 rounded bg-muted animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <div className="text-red-800 dark:text-red-200">
          <h3 className="font-semibold mb-2">Fehler beim Laden der Statistiken</h3>
          <p className="text-sm">{error || "Unbekannter Fehler"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Score Chart */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <CircleChart 
            percentage={stats.score.percentage} 
            color="#10b981" 
            size={120}
            strokeWidth={8}
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.score.percentage}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                richtig
              </div>
            </div>
          </CircleChart>
          
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Antwortqualität</h3>
              <p className="text-sm text-muted-foreground">Alle bisher ausgewerteten Antworten.</p>
            </div>
            <div className="space-y-2">
              <StatLine label="Richtig" value={stats.score.correct} className="text-green-600 dark:text-green-400" />
              <StatLine label="Falsch" value={stats.score.incorrect} className="text-red-600 dark:text-red-400" />
              <StatLine label="Offen" value={stats.score.unanswered} />
            </div>
          </div>
        </div>
      </div>

      {/* Question Bank Chart */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <CircleChart 
            percentage={stats.questionBank.percentage} 
            color="#3b82f6" 
            size={120}
            strokeWidth={8}
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.questionBank.percentage}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                genutzt
              </div>
            </div>
          </CircleChart>
          
          <div className="flex-1 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Fragenbank</h3>
                <p className="text-sm text-muted-foreground">Wie viel du bereits gesehen hast.</p>
              </div>
              <div className="space-y-2">
                <StatLine label="Genutzt" value={stats.questionBank.used} className="text-blue-600 dark:text-blue-400" />
                <StatLine label="Offen" value={stats.questionBank.unused} />
                <StatLine label="Gesamt" value={stats.questionBank.total} />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Prüfungen</h3>
                <p className="text-sm text-muted-foreground">Deine bisherigen Durchläufe.</p>
              </div>
              <div className="space-y-2">
                <StatLine label="Gestartet" value={stats.tests.total} />
                <StatLine label="Beendet" value={stats.tests.finished} className="text-green-600 dark:text-green-400" />
                <StatLine label="Offen" value={stats.tests.unfinished} className="text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
