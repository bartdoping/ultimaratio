import type { Metadata } from "next"
import Link from "next/link"
import { PublicQuestion } from "@/components/share/public-question"
import { questionOfTheDay } from "@/lib/public-question"
import { getAppBaseUrl } from "@/lib/app-base-url"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const d = await questionOfTheDay()
  const title = "Frage des Tages – Medizin kreuzen"
  const description = "Jeden Tag eine neue Prüfungsfrage fürs Medizinstudium. Kreuzt du sie richtig?"
  const images = d ? [{ url: `${getAppBaseUrl()}/api/og/f/${d.id}`, width: 1200, height: 630 }] : undefined
  return {
    title,
    description,
    alternates: { canonical: "/frage-des-tages" },
    openGraph: { title, description, images },
    twitter: { card: "summary_large_image", title, description, images: images?.map((i) => i.url) },
  }
}

export default async function FrageDesTagesPage() {
  const d = await questionOfTheDay()
  const datum = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", weekday: "long", day: "numeric", month: "long" }).format(new Date())
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6">
        <div className="text-xs font-medium uppercase tracking-wide text-primary">Frage des Tages</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{datum}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Jeden Tag eine neue. Teile sie mit deiner Lerngruppe.</p>
      </div>
      {d ? (
        <PublicQuestion
          poolQuestionId={d.id}
          topic={d.topic}
          difficulty={d.difficulty}
          question={d.question}
          shareUrl={`${getAppBaseUrl()}/frage-des-tages`}
        />
      ) : (
        <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Heute noch keine Frage.{" "}
          <Link href="/kreuzen" className="font-medium text-primary">
            Direkt kreuzen
          </Link>
        </div>
      )}
    </div>
  )
}
