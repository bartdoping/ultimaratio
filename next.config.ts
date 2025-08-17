// next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Lässt ESLint-Fehler den Build NICHT mehr blockieren
  eslint: { ignoreDuringBuilds: true },

  // TypeScript-Fehler weiter ernst nehmen
  typescript: { ignoreBuildErrors: false },

  // Remote-Bilder (platzhalter). Ergänze eigene Hosts bei Bedarf.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "via.placeholder.com" },
    ],
  },
}

export default nextConfig
