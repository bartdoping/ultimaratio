import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // verhindert, dass ESLint den Vercel-Build abbricht
  eslint: { ignoreDuringBuilds: true },

  // TS-Fehler sollen den Build weiterhin stoppen (gut!)
  typescript: { ignoreBuildErrors: false },

  images: {
    remotePatterns: [{ protocol: "https", hostname: "via.placeholder.com" }],
  },
}

export default nextConfig
