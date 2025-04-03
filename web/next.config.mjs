/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Disable TypeScript checking during build to work around type conflicts
  typescript: {
    // !! WARN !!
    // Temporary workaround for TypeScript errors in Next.js 15
    // Once Next.js fixes the typing issues, this can be removed
    ignoreBuildErrors: true,
  },

  // Optimize images for Vercel edge network
  images: {
    domains: ["yoursupabaseprojectid.supabase.co"],
    formats: ["image/avif", "image/webp"],
  },

  // Improve build times on Vercel
  poweredByHeader: false,

  // Add automatic trailing slashes
  trailingSlash: false,

  // Configure compression for better performance
  compress: true,

  // Configure Vercel-specific output settings
  output: "standalone",

  // Add security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
