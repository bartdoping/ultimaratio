import type { NextConfig } from "next"

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

export default nextConfig
