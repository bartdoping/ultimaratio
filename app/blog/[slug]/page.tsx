import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getAllBlogPosts, getBlogPostBySlug, renderSimpleMarkdown } from "@/lib/blog"

export const dynamic = "force-static"
export const revalidate = 3600

type Params = { slug: string }
type Props = { params: Promise<Params> }

export async function generateStaticParams(): Promise<Params[]> {
  return getAllBlogPosts().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)
  if (!post) return { title: "Blog · fragenkreuzen.de" }
  return {
    title: `${post.title} · fragenkreuzen.de`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)
  if (!post) notFound()

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    inLanguage: "de-DE",
    author: { "@type": "Organization", name: "fragenkreuzen.de" },
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <p className="text-xs text-muted-foreground">
        <Link href="/blog" className="underline-offset-2 hover:underline">
          ← Alle Beiträge
        </Link>
        {" · "}
        {new Date(post.date).toLocaleDateString("de-DE", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        {" · "}
        {post.readingMinutes}&nbsp;Min Lesezeit
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{post.title}</h1>
      {post.description && (
        <p className="mt-2 text-muted-foreground">{post.description}</p>
      )}

      <article
        className="prose-sm mt-8 max-w-none text-foreground"
        dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(post.body) }}
      />

      <div className="mt-12 rounded-2xl border bg-card/60 p-5">
        <h2 className="text-lg font-semibold">Direkt loslegen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Teste den Generator gratis — kein Konto nötig.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/probieren"
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Demo öffnen
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Pro vergleichen
          </Link>
        </div>
      </div>
    </main>
  )
}
