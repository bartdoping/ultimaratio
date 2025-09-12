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
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Chart Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
            <div className="flex items-center space-x-6">
              <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-28"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-36"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Question Bank Chart Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
            <div className="flex items-center space-x-6">
              <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-28"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="text-red-800 dark:text-red-200">
          <h3 className="font-semibold mb-2">Fehler beim Laden der Statistiken</h3>
          <p className="text-sm">{error || "Unbekannter Fehler"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Score Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <div className="flex items-center space-x-6">
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
          
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Dein Score
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Richtig beantwortet:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {stats.score.correct}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Falsch beantwortet:</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {stats.score.incorrect}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Nicht beantwortet:</span>
                <span className="font-semibold text-gray-600 dark:text-gray-400">
                  {stats.score.unanswered}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Bank Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <div className="flex items-center space-x-6">
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
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Genutzte Fragenbank
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Genutzte Fragen:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {stats.questionBank.used}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Ungenutzte Fragen:</span>
                  <span className="font-semibold text-gray-600 dark:text-gray-400">
                    {stats.questionBank.unused}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Fragen insgesamt:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {stats.questionBank.total}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Testanzahl
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Erstellte Prüfungen:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {stats.tests.total}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Beendete Prüfungen:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {stats.tests.finished}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Nicht beendete Prüfungen:</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {stats.tests.unfinished}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
