/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' }
    ]
  },
  // @react-pdf/renderer uses browser-only APIs (canvas, etc.) that break
  // Next.js server-side module analysis even when imported in client components.
  serverExternalPackages: ['@react-pdf/renderer'],
};

export default nextConfig;
