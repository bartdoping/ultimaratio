import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Lint-Fehler sollen den Build NICHT abbrechen (Vercel)
  eslint: { ignoreDuringBuilds: true },

  // TypeScript-Fehler weiterhin ernst nehmen
  typescript: { ignoreBuildErrors: false },

  images: {
    remotePatterns: [{ protocol: "https", hostname: "via.placeholder.com" }],
  },
}

export default nextConfig
