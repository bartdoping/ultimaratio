"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StartExamButton } from "@/components/start-exam-button"
import {
  FreeTrialExamPromo,
  type FreeTrialExamPayload,
} from "@/components/free-trial-exam-promo"

interface Exam {
  id: string
  slug: string
  title: string
  description: string
  priceCents: number | null
  disableStartPopup?: boolean
  _count: {
    questions: number
  }
  tags?: Array<{
    id: string
    name: string
    slug: string
  }>
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
  hasProAccess: boolean
  purchasedExamIds: string[]
  openAttempts?: Array<{
    id: string
    examId: string
    startedAt: Date
    elapsedSec: number | null
  }>
  freeTrialExam?: FreeTrialExamPayload | null
  showFreeTrialSection?: boolean
  loggedIn?: boolean
}

function formatEur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100)
}

export default function ExamsCategorized({ 
  categories, 
  examsWithoutCategory, 
  hasProAccess,
  purchasedExamIds,
  openAttempts = [],
  freeTrialExam = null,
  showFreeTrialSection = false,
  loggedIn = false,
}: ExamsCategorizedProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const purchasedSet = new Set(purchasedExamIds)

  const allExams = [
    ...examsWithoutCategory.map(exam => ({ ...exam, categoryId: null })),
    ...categories.flatMap(category => 
      category.exams.map(exam => ({ ...exam, categoryId: category.id }))
    )
  ]

  const allTags = Array.from(
    new Map(
      allExams
        .flatMap(exam => exam.tags ?? [])
        .map(tag => [tag.id, tag] as const)
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name, "de"))

  const normalizedSearch = searchQuery.trim().toLowerCase()

  const displayedExams = allExams
    .filter(exam =>
      selectedCategory
        ? (
        selectedCategory === "uncategorized"
          ? exam.categoryId === null
          : exam.categoryId === selectedCategory
        )
        : true
    )
    .filter(exam =>
      selectedTagId
        ? (exam.tags ?? []).some(tag => tag.id === selectedTagId)
        : true
    )
    .filter(exam => {
      if (!normalizedSearch) return true
      const categoryName = exam.categoryId
        ? categories.find(category => category.id === exam.categoryId)?.name ?? ""
        : ""
      const haystack = [
        exam.title,
        exam.description,
        categoryName,
        ...(exam.tags ?? []).map(tag => tag.name),
      ].join(" ").toLowerCase()
      return haystack.includes(normalizedSearch)
    })

  return (
    <div className="space-y-6">
      {showFreeTrialSection && freeTrialExam && (
        <FreeTrialExamPromo exam={freeTrialExam} loggedIn={loggedIn} />
      )}

      {/* Kategorie-Filter */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Katalog filtern</h2>
          <p className="text-sm text-muted-foreground">Suche nach Prüfung, Fachbereich oder Tag und grenze die Liste nach Kategorie ein.</p>
        </div>
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Suche nach Titel, Beschreibung, Kategorie oder Tag..."
          aria-label="Prüfungskatalog durchsuchen"
          className="max-w-2xl"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            onClick={() => setSelectedCategory(null)}
            size="sm"
          >
            Alle ({allExams.length})
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
              {category.name}
              <span className="text-xs opacity-70">{category.exams.length}</span>
            </Button>
          ))}
          {examsWithoutCategory.length > 0 && (
            <Button
              variant={selectedCategory === "uncategorized" ? "default" : "outline"}
              onClick={() => setSelectedCategory("uncategorized")}
              size="sm"
            >
              Ohne Kategorie
              <span className="ml-1 text-xs opacity-70">{examsWithoutCategory.length}</span>
            </Button>
          )}
        </div>
        {allTags.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedTagId === null ? "secondary" : "outline"}
                onClick={() => setSelectedTagId(null)}
                size="sm"
              >
                Alle Tags
              </Button>
              {allTags.slice(0, 18).map(tag => (
                <Button
                  key={tag.id}
                  variant={selectedTagId === tag.id ? "default" : "outline"}
                  onClick={() => setSelectedTagId(tag.id)}
                  size="sm"
                >
                  {tag.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Prüfungen anzeigen */}
      <div className="space-y-4">
        {(selectedCategory || selectedTagId || normalizedSearch) && (
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">
              Gefilterte Prüfungen
            </h3>
            <Badge variant="secondary">
              {displayedExams.length} Prüfung{displayedExams.length !== 1 ? 'en' : ''}
            </Badge>
          </div>
        )}

        <div className="grid gap-4">
          {displayedExams.map((exam) => {
            const canUseExam = hasProAccess || purchasedSet.has(exam.id)
            const category = exam.categoryId ? categories.find(c => c.id === exam.categoryId) : null
            const examOpenAttempts = openAttempts.filter(attempt => attempt.examId === exam.id)
            const sellable =
              typeof exam.priceCents === "number" &&
              Number.isFinite(exam.priceCents) &&
              exam.priceCents > 0
            
            return (
              <Card key={exam.id} className="overflow-hidden shadow-sm">
                <CardHeader className="space-y-3">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-xl leading-tight">{exam.title}</CardTitle>
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
                        {(exam.tags ?? []).slice(0, 3).map(tag => (
                          <Badge key={tag.id} variant="outline" className="text-xs">
                            {tag.name}
                          </Badge>
                        ))}
                        <Badge variant="secondary" className="text-xs">
                          {exam._count.questions} Frage{exam._count.questions !== 1 ? 'n' : ''}
                        </Badge>
                        {canUseExam && (
                          <Badge className="text-xs">Freigeschaltet</Badge>
                        )}
                        {sellable && !canUseExam && (
                          <Badge variant="outline" className="text-xs border-primary/40">
                            ab {formatEur(exam.priceCents!)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">{exam.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {!canUseExam ? (
                      <p className="text-sm text-muted-foreground">
                        {sellable && loggedIn
                          ? "Als Einzelkauf oder mit Pro freischaltbar."
                          : sellable
                            ? "Einloggen, um Einzelkauf oder Pro-Zugang zu nutzen."
                            : "Mit Pro freischaltbar."}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Bereit zum Starten oder gezielten Üben.</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" asChild>
                        <Link href={`/exams/${exam.slug}`}>Details</Link>
                      </Button>

                      {canUseExam && (
                        <StartExamButton examId={exam.id} disableStartPopup={!!exam.disableStartPopup} />
                      )}
                    </div>
                  </div>

                  {/* Offene Prüfungsdurchläufe */}
                  {examOpenAttempts.length > 0 && (
                    <div className="border-t pt-3">
                      <h4 className="text-sm font-medium mb-2">Offene Durchläufe</h4>
                      <div className="space-y-2">
                        {examOpenAttempts.map((attempt) => {
                          const startTime = new Date(attempt.startedAt)
                          const elapsedMinutes = Math.floor((attempt.elapsedSec || 0) / 60)
                          
                          return (
                            <div key={attempt.id} className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="text-sm">
                                <div className="font-medium">Gestartet am {startTime.toLocaleDateString('de-DE')} um {startTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
                                {elapsedMinutes > 0 && <div className="text-muted-foreground">{elapsedMinutes} Min. bearbeitet</div>}
                              </div>
                              <Link href={`/exam-run/${attempt.id}`}>
                                <Button size="sm" className="w-full sm:w-auto">Fortsetzen</Button>
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
          <div className="rounded-xl border bg-card py-12 text-center text-muted-foreground">
            <p>Keine Prüfungen für diese Filter gefunden.</p>
          </div>
        )}
      </div>
    </div>
  )
}
