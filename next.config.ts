import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "via.placeholder.com" }],
  },
}

export default nextConfig
