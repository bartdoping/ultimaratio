import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs/config"

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // früher /new — vermeidet Konflikte mit dynamischem [id] in manchen Umgebungen
      { source: "/admin/exams/new", destination: "/admin/exams/create", permanent: false },
    ]
  },

  // verhindert, dass ESLint den Vercel-Build abbricht
  eslint: { ignoreDuringBuilds: true },

  // TS-Fehler sollen den Build weiterhin stoppen (gut!)
  typescript: { ignoreBuildErrors: false },

  images: {
    remotePatterns: [{ protocol: "https", hostname: "via.placeholder.com" }],
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  // Quellcode-Zuordnung nur mit Token; die Maps landen nie öffentlich im Build.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
  widenClientFileUpload: true,
  // Kein Tracing, daher auch keine Routen-Instrumentierung im Browser.
  suppressOnRouterTransitionStartWarning: true,
})
