/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/admin',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' }
    ]
  }
};

export default nextConfig;
