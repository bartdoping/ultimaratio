import type { MetadataRoute } from "next"
import { getAppBaseUrl } from "@/lib/app-base-url"

/**
 * Statische Sitemap (Server-Render). Dynamische Routes wie /exams/[slug] sind
 * absichtlich ausgespart – siehe Hinweis am Dateiende.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppBaseUrl()
  const now = new Date()

  const staticRoutes: Array<{
    path: string
    priority: number
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
  }> = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/probieren", priority: 0.95, changeFrequency: "weekly" },
    { path: "/generator", priority: 0.95, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
    { path: "/login", priority: 0.4, changeFrequency: "yearly" },
    { path: "/register", priority: 0.5, changeFrequency: "yearly" },
    { path: "/impressum", priority: 0.3, changeFrequency: "yearly" },
    { path: "/datenschutz", priority: 0.3, changeFrequency: "yearly" },
    { path: "/agb", priority: 0.3, changeFrequency: "yearly" },
    { path: "/widerruf", priority: 0.3, changeFrequency: "yearly" },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  ]

  return staticRoutes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))
}
