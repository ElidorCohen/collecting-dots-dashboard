const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['dl.dropboxusercontent.com'],
    unoptimized: true,
  },
}

export default nextConfig
