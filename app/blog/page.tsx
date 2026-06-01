import type { Metadata } from "next"
import Link from "next/link"
import { getAllBlogPosts } from "@/lib/blog"

export const dynamic = "force-static"
export const revalidate = 3600

export const metadata: Metadata = {
  title: "Blog | fragenkreuzen.de",
  description:
    "Tipps, Updates und Hintergründe rund um den KI-Generator und das Medizin-/Zahnmedizinstudium.",
  openGraph: {
    title: "Blog | fragenkreuzen.de",
    description: "Tipps und Updates rund um KI-Kreuzen.",
    type: "website",
  },
}

export default function BlogIndexPage() {
  const posts = getAllBlogPosts()
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Blog</h1>
        <p className="text-muted-foreground">
          Tipps, Updates und Hintergründe — direkt aus dem Team.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          Hier wird in Kürze der erste Beitrag erscheinen.
        </p>
      ) : (
        <ul className="mt-10 grid gap-3">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/blog/${p.slug}`}
                className="block rounded-2xl border bg-card p-5 transition-colors hover:bg-muted/30"
              >
                <p className="text-xs text-muted-foreground">
                  {new Date(p.date).toLocaleDateString("de-DE", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  · {p.readingMinutes}&nbsp;Min Lesezeit
                </p>
                <h2 className="mt-1 text-lg font-semibold">{p.title}</h2>
                {p.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
