const SECURITY_HEADERS = [
  // Enforce HTTPS for 2 years, include subdomains, opt in to HSTS preload list
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Prevent embedding in frames from other origins
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Block MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Enable legacy XSS filter in older browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Only send origin in referrer for cross-origin requests
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restrict browser feature access
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js requires unsafe-inline for hydration scripts; unsafe-eval for dynamic imports
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Tailwind + Next.js inject inline styles
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      // data: for base64 images (PDF), blob: for generated PDFs, https: for Supabase Storage
      "img-src 'self' data: blob: https:",
      // Supabase REST + Realtime WS, Open-Meteo weather API
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.open-meteo.com",
      // Prevent embedding by foreign sites (complements X-Frame-Options)
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Codebase reached zero type errors (2026-06 audit) — keep it that way.
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' }
    ]
  },
  experimental: {
    // @react-pdf/renderer uses browser-only APIs (canvas, etc.) that break
    // Next.js server-side module analysis even when imported in client components.
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
