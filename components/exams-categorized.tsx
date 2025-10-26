"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StartExamButton } from "@/components/start-exam-button"

interface Exam {
  id: string
  slug: string
  title: string
  description: string
  _count: {
    questions: number
  }
}

interface Category {
  id: string
  name: string
  color: string | null
  exams: Exam[]
}

interface ExamsCategorizedProps {
  categories: Category[]
  examsWithoutCategory: Exam[]
  hasAccess: boolean
  openAttempts?: Array<{
    id: string
    examId: string
    createdAt: Date
    elapsedSec: number | null
  }>
}

export default function ExamsCategorized({ 
  categories, 
  examsWithoutCategory, 
  hasAccess,
  openAttempts = []
}: ExamsCategorizedProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const allExams = [
    ...examsWithoutCategory.map(exam => ({ ...exam, categoryId: null })),
    ...categories.flatMap(category => 
      category.exams.map(exam => ({ ...exam, categoryId: category.id }))
    )
  ]

  const displayedExams = selectedCategory 
    ? allExams.filter(exam => exam.categoryId === selectedCategory)
    : allExams

  return (
    <div className="space-y-6">
      {/* Kategorie-Filter */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Nach Kategorien filtern</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            onClick={() => setSelectedCategory(null)}
            size="sm"
          >
            Alle Prüfungen ({allExams.length})
          </Button>
          {categories.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.id)}
              size="sm"
              className="flex items-center gap-2"
            >
              {category.color && (
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: category.color }}
                />
              )}
              {category.name} ({category.exams.length})
            </Button>
          ))}
          {examsWithoutCategory.length > 0 && (
            <Button
              variant={selectedCategory === "uncategorized" ? "default" : "outline"}
              onClick={() => setSelectedCategory("uncategorized")}
              size="sm"
            >
              Ohne Kategorie ({examsWithoutCategory.length})
            </Button>
          )}
        </div>
      </div>

      {/* Prüfungen anzeigen */}
      <div className="space-y-4">
        {selectedCategory && (
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">
              {selectedCategory === "uncategorized" 
                ? "Prüfungen ohne Kategorie" 
                : categories.find(c => c.id === selectedCategory)?.name
              }
            </h3>
            <Badge variant="secondary">
              {displayedExams.length} Prüfung{displayedExams.length !== 1 ? 'en' : ''}
            </Badge>
          </div>
        )}

        <div className="grid gap-4">
          {displayedExams.map((exam) => {
            const isActivated = hasAccess
            const category = exam.categoryId ? categories.find(c => c.id === exam.categoryId) : null
            const examOpenAttempts = openAttempts.filter(attempt => attempt.examId === exam.id)
            
            return (
              <Card key={exam.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{exam.title}</CardTitle>
                        {category && (
                          <Badge 
                            variant="outline" 
                            className="flex items-center gap-1"
                          >
                            {category.color && (
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: category.color }}
                              />
                            )}
                            {category.name}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {exam._count.questions} Frage{exam._count.questions !== 1 ? 'n' : ''}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{exam.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                      href={`/exams/${exam.slug}`}
                    >
                      Details
                    </Link>

                    {!hasAccess && (
                      <div className="text-sm text-muted-foreground">
                        Pro-Abonnement erforderlich
                      </div>
                    )}

                    {isActivated && (
                      <StartExamButton examId={exam.id} />
                    )}
                  </div>

                  {/* Offene Prüfungsdurchläufe */}
                  {examOpenAttempts.length > 0 && (
                    <div className="border-t pt-3">
                      <h4 className="text-sm font-medium mb-2">Offene Prüfungsdurchläufe ({examOpenAttempts.length})</h4>
                      <div className="space-y-2">
                        {examOpenAttempts.map((attempt) => {
                          const startTime = new Date(attempt.createdAt)
                          const elapsedMinutes = Math.floor((attempt.elapsedSec || 0) / 60)
                          
                          return (
                            <div key={attempt.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                              <div className="text-sm">
                                <div>Gestartet: {startTime.toLocaleDateString('de-DE')} um {startTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
                                {elapsedMinutes > 0 && <div className="text-muted-foreground">Verstrichene Zeit: {elapsedMinutes} Min</div>}
                              </div>
                              <Link href={`/exam-run/${attempt.id}`}>
                                <Button size="sm">Weiter</Button>
                              </Link>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {displayedExams.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Keine Prüfungen in dieser Kategorie gefunden</p>
          </div>
        )}
      </div>
    </div>
  )
}
