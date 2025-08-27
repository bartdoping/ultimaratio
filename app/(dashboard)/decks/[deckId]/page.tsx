// app/(dashboard)/decks/[deckId]/page.tsx
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import DeckEditor from "./_client-editor"

type Props = { params: Promise<{ deckId: string }> }
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function DeckDetailPage({ params }: Props) {
  const { deckId } = await params

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) redirect("/login")

  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId: me.id },
    select: {
      id: true,
      title: true,
      description: true,
      items: {
        orderBy: { order: "asc" },
        select: {
          order: true,
          question: {
            select: {
              id: true,
              stem: true,
              exam: { select: { title: true } },
              case: { select: { title: true } },
              tags: {
                select: {
                  tag: { select: { slug: true, name: true } }
                }
              }
            },
          },
        },
      },
    },
  })

  if (!deck) notFound()

  const initialItems = deck.items.map((it) => ({
    questionId: it.question.id,
    order: it.order,
    stem: it.question.stem,
    caseTitle: it.question.case?.title ?? null,
    examTitle: it.question.exam.title,
    tags: it.question.tags.map(t => ({ slug: t.tag.slug, name: t.tag.name })),
  }))

  // optionale Tag-Liste (für UI-Filter)
  const availableTags = await prisma.tag.findMany({
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, parentId: true },
  })

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{deck.title}</h1>
        <div className="flex gap-2">
          <Link href="/decks"><Button variant="outline">Zurück</Button></Link>
          <Link href={`/practice/deck/${deck.id}`}><Button>Üben</Button></Link>
        </div>
      </div>

      {deck.description && (
        <p className="text-sm text-muted-foreground">{deck.description}</p>
      )}

      {/* Client-Editor: Suche, Hinzufügen/Entfernen, Liste */}
      <DeckEditor
        deckId={deck.id}
        initialTitle={deck.title}
        initialDescription={deck.description ?? ""}
        initialItems={initialItems}
        availableTags={availableTags}
      />
    </div>
  )
}