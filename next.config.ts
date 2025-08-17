// next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Lint-Fehler brechen den Build nicht mehr ab
  eslint: { ignoreDuringBuilds: true },

  // TypeScript-Fehler sollen weiterhin brechen (Empfehlung)
  typescript: { ignoreBuildErrors: false },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "via.placeholder.com" },
    ],
  },
}

export default nextConfig
