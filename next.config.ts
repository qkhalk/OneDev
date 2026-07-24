import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {},
  async rewrites() {
    return []
  },
}

export default nextConfig
