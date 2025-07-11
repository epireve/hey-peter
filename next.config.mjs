/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output configuration - standalone for Docker, default for Vercel
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
          }
        ],
      },
    ];
  },
  
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
  
  // Bundle Analyzer Configuration (when NODE_ENV=analyze)
  ...(process.env.ANALYZE === 'true' && {
    bundleAnalyzer: {
      enabled: true,
    },
  }),
  
  // Experimental features for code splitting optimization
  experimental: {
    // Enable modern bundling features
    optimizeCss: true,
    optimizePackageImports: [
      '@tanstack/react-query',
      '@tanstack/react-table',
      'recharts',
      'lucide-react',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
      'date-fns',
      'xlsx',
      'react-hook-form',
      'zod',
    ],
  },
  
  // Webpack configuration for optimal code splitting
  webpack: (config, { isServer, dev }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }

    // Optimize bundle splitting for production
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 250000,
          cacheGroups: {
            // Vendor chunk for node_modules
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
            // UI Components chunk
            ui: {
              test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
              name: 'ui-components',
              chunks: 'all',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Admin components chunk
            admin: {
              test: /[\\/]src[\\/](components|app)[\\/]admin[\\/]/,
              name: 'admin-components',
              chunks: 'all',
              priority: 30,
              reuseExistingChunk: true,
            },
            // Student components chunk
            student: {
              test: /[\\/]src[\\/](components|app)[\\/]student[\\/]/,
              name: 'student-components',
              chunks: 'all',
              priority: 30,
              reuseExistingChunk: true,
            },
            // Teacher components chunk
            teacher: {
              test: /[\\/]src[\\/](components|app)[\\/]teacher[\\/]/,
              name: 'teacher-components',
              chunks: 'all',
              priority: 30,
              reuseExistingChunk: true,
            },
            // Analytics components chunk
            analytics: {
              test: /[\\/]src[\\/]components[\\/].*[\\/]analytics[\\/]/,
              name: 'analytics-components',
              chunks: 'all',
              priority: 25,
              reuseExistingChunk: true,
            },
            // Charts chunk (heavy recharts dependency)
            charts: {
              test: /[\\/]node_modules[\\/](recharts|d3-.*|victory-.*)[\\/]/,
              name: 'charts',
              chunks: 'all',
              priority: 15,
              reuseExistingChunk: true,
            },
            // React Table chunk
            table: {
              test: /[\\/]node_modules[\\/]@tanstack[\\/]react-table[\\/]/,
              name: 'react-table',
              chunks: 'all',
              priority: 15,
              reuseExistingChunk: true,
            },
            // Date manipulation
            date: {
              test: /[\\/]node_modules[\\/](date-fns|moment|dayjs)[\\/]/,
              name: 'date-utils',
              chunks: 'all',
              priority: 15,
              reuseExistingChunk: true,
            },
            // Form libraries
            forms: {
              test: /[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/,
              name: 'forms',
              chunks: 'all',
              priority: 15,
              reuseExistingChunk: true,
            },
            // Office/Excel libraries
            office: {
              test: /[\\/]node_modules[\\/](xlsx|exceljs|file-saver)[\\/]/,
              name: 'office-utils',
              chunks: 'all',
              priority: 15,
              reuseExistingChunk: true,
            },
            // Radix UI components
            radix: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: 'radix-ui',
              chunks: 'all',
              priority: 15,
              reuseExistingChunk: true,
            },
            // Icons
            icons: {
              test: /[\\/]node_modules[\\/](lucide-react|@heroicons|react-icons)[\\/]/,
              name: 'icons',
              chunks: 'all',
              priority: 15,
              reuseExistingChunk: true,
            },
            // Default chunk for remaining vendors
            default: {
              minChunks: 2,
              chunks: 'all',
              priority: 1,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },
};

export default nextConfig;
