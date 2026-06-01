/**
 * File-basierte Blog-Engine.
 *
 * Posts liegen unter `content/blog/<slug>.md` und beginnen mit einem schlanken
 * Frontmatter-Block (--- ... ---). Wir vermeiden bewusst MDX/Compiler, um den
 * Bundle nicht aufzublähen — der Body wird als sehr einfaches Markdown gerendert.
 */

import { readFileSync, readdirSync, statSync } from "fs"
import path from "path"

export type BlogPost = {
  slug: string
  title: string
  description: string
  date: string // ISO
  /** Geschätzte Lesezeit in Minuten. */
  readingMinutes: number
  /** Roh-Markdown-Body, exklusive Frontmatter. */
  body: string
  /** Optional: Top-Image-URL. */
  image?: string | null
  /** Optional: Tags. */
  tags?: string[]
}

const BLOG_DIR = path.join(process.cwd(), "content", "blog")

function safeReaddir(dir: string): string[] {
  try {
    return readdirSync(dir)
  } catch {
    return []
  }
}

function parseFrontmatter(raw: string): {
  data: Record<string, string | string[]>
  body: string
} {
  if (!raw.startsWith("---")) return { data: {}, body: raw }
  const end = raw.indexOf("\n---", 3)
  if (end < 0) return { data: {}, body: raw }
  const yaml = raw.slice(3, end).trim()
  const body = raw.slice(end + 4).replace(/^\n+/, "")
  const data: Record<string, string | string[]> = {}
  for (const line of yaml.split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*:\s*(.+?)\s*$/)
    if (!m) continue
    const key = m[1]
    const valRaw = m[2]
    if (valRaw.startsWith("[") && valRaw.endsWith("]")) {
      data[key] = valRaw
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean)
    } else {
      data[key] = valRaw.replace(/^['"]|['"]$/g, "")
    }
  }
  return { data, body }
}

function estimateReadingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

function loadFile(filename: string): BlogPost | null {
  const slug = filename.replace(/\.md$/i, "")
  const full = path.join(BLOG_DIR, filename)
  let raw: string
  try {
    raw = readFileSync(full, "utf8")
  } catch {
    return null
  }
  const { data, body } = parseFrontmatter(raw)
  const title = typeof data.title === "string" ? data.title : slug
  const description = typeof data.description === "string" ? data.description : ""
  const date =
    typeof data.date === "string"
      ? data.date
      : (() => {
          try {
            return statSync(full).mtime.toISOString()
          } catch {
            return new Date().toISOString()
          }
        })()
  const image =
    typeof data.image === "string" && data.image.length > 0 ? data.image : null
  const tags = Array.isArray(data.tags) ? (data.tags as string[]) : undefined

  return {
    slug,
    title,
    description,
    date,
    readingMinutes: estimateReadingMinutes(body),
    body,
    image,
    tags,
  }
}

export function getAllBlogPosts(): BlogPost[] {
  const files = safeReaddir(BLOG_DIR).filter((f) => f.toLowerCase().endsWith(".md"))
  const posts = files.map(loadFile).filter((p): p is BlogPost => !!p)
  // Neueste zuerst
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getBlogPostBySlug(slug: string): BlogPost | null {
  const safe = slug.replace(/[^a-z0-9-_]/gi, "")
  if (!safe) return null
  return loadFile(`${safe}.md`)
}

/** Sehr einfacher Markdown-→-HTML-Renderer (keine externe Lib). */
export function renderSimpleMarkdown(md: string): string {
  // Sicher gegen einfache Injection durch HTML-Escape.
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")

  const lines = md.split("\n")
  const out: string[] = []
  let inList = false
  let inCode = false
  let codeBuf: string[] = []

  function flushList() {
    if (inList) {
      out.push("</ul>")
      inList = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith("```")) {
      if (inCode) {
        out.push(
          `<pre class="rounded-md bg-muted/40 px-3 py-2 text-xs overflow-x-auto"><code>${codeBuf
            .map(esc)
            .join("\n")}</code></pre>`
        )
        codeBuf = []
        inCode = false
      } else {
        flushList()
        inCode = true
      }
      continue
    }
    if (inCode) {
      codeBuf.push(line)
      continue
    }

    if (/^\s*$/.test(line)) {
      flushList()
      continue
    }
    if (line.startsWith("### ")) {
      flushList()
      out.push(`<h3 class="mt-6 text-lg font-semibold">${esc(line.slice(4))}</h3>`)
      continue
    }
    if (line.startsWith("## ")) {
      flushList()
      out.push(`<h2 class="mt-8 text-xl font-semibold tracking-tight">${esc(line.slice(3))}</h2>`)
      continue
    }
    if (line.startsWith("# ")) {
      flushList()
      out.push(`<h1 class="mt-2 text-2xl font-semibold tracking-tight">${esc(line.slice(2))}</h1>`)
      continue
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        out.push('<ul class="list-disc pl-5 space-y-1.5 my-3">')
        inList = true
      }
      out.push(`<li>${inlineFormat(esc(line.slice(2)))}</li>`)
      continue
    }
    flushList()
    out.push(`<p class="my-3 leading-relaxed">${inlineFormat(esc(line))}</p>`)
  }
  flushList()
  if (inCode && codeBuf.length > 0) {
    out.push(`<pre><code>${codeBuf.map(esc).join("\n")}</code></pre>`)
  }
  return out.join("\n")
}

function inlineFormat(s: string): string {
  // Links: [text](url)
  s = s.replace(
    /\[([^\]]+)\]\((https?:[^)]+)\)/g,
    '<a href="$2" class="underline underline-offset-2 hover:text-primary" rel="noopener noreferrer" target="_blank">$1</a>'
  )
  // Bold: **text**
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  // Italic: *text*
  s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>")
  // Code: `code`
  s = s.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-muted/40 px-1 py-0.5 text-[0.9em]">$1</code>'
  )
  return s
}
