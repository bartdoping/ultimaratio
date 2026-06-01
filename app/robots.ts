import type { MetadataRoute } from "next"
import { getAppBaseUrl } from "@/lib/app-base-url"

export default function robots(): MetadataRoute.Robots {
  const base = getAppBaseUrl()
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/account",
          "/dashboard",
          "/subscription",
          "/exam-run/",
          "/sr/",
          "/decks/",
          "/practice/",
          "/forgot-password",
          "/reset",
          "/verify",
        ],
      },
      {
        // KI-Crawler: erlauben für /, /probieren, /blog, /pricing
        userAgent: ["GPTBot", "Claude-Web", "PerplexityBot"],
        allow: ["/", "/probieren", "/blog", "/pricing"],
        disallow: ["/account", "/admin", "/api/", "/dashboard", "/subscription"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
