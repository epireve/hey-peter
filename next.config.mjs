/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output configuration - standalone for Docker, default for Vercel
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  
  // Temporarily skip TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Skip ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Allow external images from Supabase storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  
  // Docker-specific configuration
  experimental: {
    // Other experimental features can be added here
  },
  
  // Webpack configuration for Docker
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
