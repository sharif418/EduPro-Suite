import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: 'standalone',
  
  // Production hardening - improved error handling
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json',
  },
  
  // Compression and performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Security headers
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const isProd = process.env.NODE_ENV === 'production';
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['https://abrar.ailearnersbd.com'];
    
    // Build CSP by environment
    const cspDirectives = [
      "default-src 'self'",
      // Script sources - strict for production
      isDev 
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'strict-dynamic' https:",
      // Connect sources - explicit hosts for production
      isDev
        ? "connect-src 'self' http://* ws://* wss://* https://* data: blob:"
        : `connect-src 'self' ${allowedOrigins.join(' ')} wss://${allowedOrigins.map(o => o.replace('https://', '')).join(' wss://')} data: blob:`,
      // Image sources
      "img-src 'self' data: blob: https: http:",
      // Style sources
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Font sources
      "font-src 'self' https://fonts.gstatic.com data:",
      // Other directives
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // Allow iframe in development for Replit proxy
      isDev ? "frame-ancestors *" : "frame-ancestors 'none'",
      ...(isProd ? ["upgrade-insecure-requests"] : [])
    ];
    
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers - Allow iframe in development for Replit proxy
          ...(isDev ? [] : [{
            key: 'X-Frame-Options',
            value: 'DENY'
          }]),
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
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          // Content Security Policy - tightened for production
          {
            key: 'Content-Security-Policy',
            value: cspDirectives.join('; ')
          },
          // HSTS for production only
          ...(isProd ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }] : [])
        ]
      }
    ];
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: process.env.ALLOWED_IMAGE_DOMAINS?.split(',') || ['abrar.ailearnersbd.com'],
  },

  // Experimental features for performance and standalone build
  experimental: {
    ...(process.env.NODE_ENV === 'development' && {
      serverActions: {
        allowedOrigins: ['*'],
      },
    }),
  },

  // Webpack optimizations - disabled for Replit memory constraints
  // webpack: (config, { dev, isServer }) => {
  //   return config;
  // },

  // Environment-specific configurations
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    APP_VERSION: process.env.npm_package_version || '1.0.0',
    BUILD_TIME: new Date().toISOString(),
  },

  // Redirects for SEO and user experience
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/en/admin',
        permanent: true,
      },
      {
        source: '/teacher',
        destination: '/en/teacher',
        permanent: true,
      },
      {
        source: '/student',
        destination: '/en/student',
        permanent: true,
      },
      {
        source: '/guardian',
        destination: '/en/guardian',
        permanent: true,
      },
    ];
  },

  // Rewrites for API versioning
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

export default withNextIntl(nextConfig);
