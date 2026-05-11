let userConfig = undefined
try {
  // try to import ESM first
  userConfig = await import('./v0-user-next.config.mjs')
} catch (e) {
  try {
    // fallback to CJS import
    userConfig = await import("./v0-user-next.config");
  } catch (innerError) {
    // ignore error
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'meal-subscription-andy-photos.s3.ap-southeast-2.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      ...(process.env.AWS_CLOUDFRONT_DOMAIN
        ? [
            {
              protocol: 'https',
              hostname: process.env.AWS_CLOUDFRONT_DOMAIN,
              port: '',
              pathname: '/**',
            },
          ]
        : []),
    ],
  },
  // Use more compatible configuration to increase body size limit
  serverRuntimeConfig: {
    // Will only be available on the server side
    bodyParserSizeLimit: '10mb',
  },
  // Completely disable SSR for the dashboard page
  // This prevents errors with client-side only libraries like heic2any
  reactStrictMode: true,
  compiler: {
    // Enables the styled-components SWC transform
    styledComponents: true
  },
  // This is the key configuration to disable SSR for specific paths
  experimental: {
    // Disable server components for specific paths
    serverComponentsExternalPackages: ['heic2any'],
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  webpack: (config, { isServer }) => {
    // If client-side (browser), provide empty implementations for Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        os: false,
      };
    }
    return config;
  },
  async headers() {
    return [];
  },
  output: 'standalone',
  poweredByHeader: false,
}

if (userConfig) {
  // ESM imports will have a "default" property
  const config = userConfig.default || userConfig

  for (const key in config) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...config[key],
      }
    } else {
      nextConfig[key] = config[key]
    }
  }
}

export default nextConfig
