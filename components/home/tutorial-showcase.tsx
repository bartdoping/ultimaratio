"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type MediaKind = "video" | "image"

type Item = {
  id: string
  group: "Einstieg" | "Prüfungsmodus" | "Lernen & Wiederholen" | "Organisation" | "Pro & Zugriff"
  title: string
  subtitle: string
  description: string
  media: { kind: MediaKind; label: string }
  cta?: { label: string; href: string }
}

const ITEMS: Item[] = [
  {
    id: "start",
    group: "Einstieg",
    title: "In 60 Sekunden starten",
    subtitle: "Von der Prüfungsauswahl bis zum ersten Versuch",
    description:
      "Zeigt den schnellsten Weg: Prüfung finden, Details ansehen und einen Versuch starten. Ideal als erster Einstieg für neue Nutzer.",
    media: { kind: "video", label: "Screenrecording: Start flow" },
    cta: { label: "Zu den Prüfungen", href: "/exams" },
  },
  {
    id: "trial",
    group: "Einstieg",
    title: "Kostenlos testen (Probedeck)",
    subtitle: "Ein realer Prüfungsdurchlauf zum Ausprobieren",
    description:
      "Erklärt das kostenlose Probedeck für Nicht‑Pro‑Nutzer: wo es auftaucht, was es zeigt und wie man direkt loslegt.",
    media: { kind: "image", label: "Screenshot: Probedeck-Promo" },
    cta: { label: "Probedeck ansehen", href: "/exams" },
  },
  {
    id: "exam-runner",
    group: "Prüfungsmodus",
    title: "Prüfungsmodus wie in echt",
    subtitle: "Timer, Navigation, klare Struktur",
    description:
      "Visualisiert den Prüfungs-Runner: Timer, Fragenübersicht, Navigation und Fokus auf zügiges Arbeiten – wie in der echten Prüfung.",
    media: { kind: "video", label: "Screenrecording: Prüfungsmodus" },
  },
  {
    id: "cases-media",
    group: "Prüfungsmodus",
    title: "Fallvignetten & Bildfragen",
    subtitle: "Mehrteilige Fälle, Medien sauber integriert",
    description:
      "Zeigt Fälle mit Unterfragen, Bild-/Medienanzeige und den typischen Workflow beim Bearbeiten von Fallvignetten.",
    media: { kind: "image", label: "Screenshot: Fall + Bild" },
  },
  {
    id: "immediate-feedback",
    group: "Prüfungsmodus",
    title: "Optionales Sofort‑Feedback",
    subtitle: "Direkt lernen – ohne den Flow zu verlieren",
    description:
      "Demonstriert Sofort‑Feedback (falls aktiviert): warum eine Antwort richtig/falsch ist und wie das den Lernfortschritt beschleunigt.",
    media: { kind: "video", label: "Screenrecording: Sofort-Feedback" },
  },
  {
    id: "evaluation",
    group: "Prüfungsmodus",
    title: "Auswertung, die wirklich hilft",
    subtitle: "Bestehen, Prozent, Erkenntnisse",
    description:
      "Zeigt die Ergebnisansicht: Score, Bestehen/Nichtbestehen, Überblick und wie du daraus gezielt deine nächsten Schritte ableitest.",
    media: { kind: "image", label: "Screenshot: Auswertung" },
  },
  {
    id: "practice-mode",
    group: "Lernen & Wiederholen",
    title: "Übungsmodus für entspanntes Training",
    subtitle: "Wiederholen ohne Druck",
    description:
      "Erklärt Üben abseits der Prüfung: Antworten geben, Begriffe nachschlagen, Inhalte vertiefen – ideal für tägliche Sessions.",
    media: { kind: "video", label: "Screenrecording: Übungsmodus" },
  },
  {
    id: "sr",
    group: "Lernen & Wiederholen",
    title: "Spaced Repetition in Decks",
    subtitle: "Gezielt wiederholen statt zufällig kreuzen",
    description:
      "Zeigt Spaced Repetition: fällige Karten, Deck‑bezogenes Training und die wichtigsten Einstellungen, um nachhaltig zu lernen.",
    media: { kind: "video", label: "Screenrecording: SR-Training" },
  },
  {
    id: "marking",
    group: "Organisation",
    title: "Markieren & Falsch beantwortet",
    subtitle: "Deine persönlichen Lernlisten",
    description:
      "Zeigt Markierungen und Lernlisten (z. B. markiert/falsch): damit du schwierige Themen schnell wiederfindest und gezielt übst.",
    media: { kind: "image", label: "Screenshot: Markierungen & Listen" },
  },
  {
    id: "decks",
    group: "Organisation",
    title: "Eigene Prüfungsdecks (Pro)",
    subtitle: "Themen-Decks erstellen und verwalten",
    description:
      "Demonstriert eigene Decks: Deck anlegen, Fragen hinzufügen, Deck strukturieren und daraus trainieren – perfekt für Themenblöcke.",
    media: { kind: "video", label: "Screenrecording: Deck erstellen" },
    cta: { label: "Pro ansehen", href: "/subscription" },
  },
  {
    id: "search-tags",
    group: "Organisation",
    title: "Tags & Filter: genau die Fragen, die du brauchst",
    subtitle: "Suchen, filtern, fokussieren",
    description:
      "Zeigt Tag-Filter und Suche: schnelle Eingrenzung nach Themen (inkl. Supertags) – damit jede Session ein klares Ziel hat.",
    media: { kind: "image", label: "Screenshot: Tags/Filter" },
  },
  {
    id: "access",
    group: "Pro & Zugriff",
    title: "Zugriff: Pro oder Einzelkauf",
    subtitle: "Flexibel freischalten – dauerhaft behalten",
    description:
      "Erklärt die Modelle: Pro für alles oder einzelne Prüfungen per Einmalzahlung. Einzelkäufe bleiben auch nach Abo‑Kündigung erhalten.",
    media: { kind: "image", label: "Screenshot: Kauf/Upgrade" },
    cta: { label: "Preise & Pro", href: "/subscription" },
  },
]

const GROUPS: Array<Item["group"]> = [
  "Einstieg",
  "Prüfungsmodus",
  "Lernen & Wiederholen",
  "Organisation",
  "Pro & Zugriff",
]

function MediaPlaceholder({ kind, label }: { kind: MediaKind; label: string }) {
  const title = kind === "video" ? "Video" : "Screenshot"
  return (
    <div className="relative overflow-hidden rounded-lg border border-dashed bg-muted/30">
      <div className="aspect-[16/9]" />
      <div className="absolute inset-0 grid place-items-center p-6 text-center">
        <div className="space-y-1">
          <div className="text-sm font-medium">{title}-Platzhalter</div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">
            Später ersetzt du diesen Block durch ein Bild oder Screenrecording.
          </div>
        </div>
      </div>
    </div>
  )
}

export function TutorialShowcase() {
  const [q, setQ] = useState("")
  const [activeGroup, setActiveGroup] = useState<Item["group"] | "Alle">("Alle")

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return ITEMS.filter((it) => {
      const groupOk = activeGroup === "Alle" ? true : it.group === activeGroup
      if (!groupOk) return false
      if (!query) return true
      const hay = `${it.title} ${it.subtitle} ${it.description} ${it.group}`.toLowerCase()
      return hay.includes(query)
    })
  }, [q, activeGroup])

  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <h2 className="text-xl font-semibold">So funktioniert’s – der komplette Rundgang</h2>
        <p className="mx-auto max-w-3xl text-sm text-muted-foreground">
          Hier entstehen Schritt‑für‑Schritt‑Anleitungen mit Screenshots und kurzen Videos zu allen Features.
          Nutze Suche und Filter, um schnell das passende Thema zu finden.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suchen… z. B. „Spaced Repetition“, „Decks“, „Auswertung“"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={activeGroup === "Alle" ? "default" : "outline"}
            onClick={() => setActiveGroup("Alle")}
          >
            Alle
          </Button>
          {GROUPS.map((g) => (
            <Button
              key={g}
              type="button"
              size="sm"
              variant={activeGroup === g ? "default" : "outline"}
              onClick={() => setActiveGroup(g)}
            >
              {g}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-5">
        {filtered.map((it) => (
          <Card key={it.id} id={`tutorial-${it.id}`} className="overflow-hidden">
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{it.group}</Badge>
                <Badge variant="outline">{it.media.kind === "video" ? "Video" : "Screenshot"}</Badge>
              </div>
              <CardTitle className="text-lg md:text-xl">{it.title}</CardTitle>
              <CardDescription className="text-sm">{it.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{it.description}</p>
              <MediaPlaceholder kind={it.media.kind} label={it.media.label} />
              <div className="flex flex-wrap gap-2">
                {it.cta ? (
                  <Button asChild>
                    <Link href={it.cta.href}>{it.cta.label}</Link>
                  </Button>
                ) : null}
                <Button asChild variant="outline">
                  <Link href="/exams">Zur Prüfungsübersicht</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-lg border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Keine Treffer. Versuche einen anderen Suchbegriff oder wähle „Alle“.
          </div>
        )}
      </div>
    </div>
  )
}

