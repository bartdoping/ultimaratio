import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PublicQuestion } from "@/components/share/public-question"
import { loadPublicQuestion } from "@/lib/public-question"
import { getAppBaseUrl } from "@/lib/app-base-url"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ id: string }> }

function kurz(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const d = await loadPublicQuestion(id, { shuffle: false })
  if (!d) return { title: "Frage nicht gefunden", robots: { index: false } }
  const title = `Kreuzt du das richtig? ${d.topic}`
  const description = kurz(d.question.stem, 180)
  const image = `${getAppBaseUrl()}/api/og/f/${d.id}`
  return {
    title,
    description,
    // KI-erzeugte Fragen nicht in den Suchindex — geteilt werden dürfen sie.
    robots: { index: false, follow: true },
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }], type: "article" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  }
}

export default async function SharedQuestionPage({ params }: Props) {
  const { id } = await params
  const d = await loadPublicQuestion(id)
  if (!d) notFound()
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <PublicQuestion
        poolQuestionId={d.id}
        topic={d.topic}
        difficulty={d.difficulty}
        question={d.question}
        shareUrl={`${getAppBaseUrl()}/f/${d.id}`}
      />
    </div>
  )
}
