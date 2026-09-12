/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Note: microphone allowed for Axiom voice features (DeviceScanner)
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // unsafe-eval needed by Next.js dev; cdn.plaid.com loads the Plaid Link SDK
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.plaid.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              // Plaid uses iframes for its Link UI; X-Frame-Options DENY would also break this
              "frame-src https://cdn.plaid.com https://*.plaid.com",
              // Plaid API calls + Anthropic + local dev websocket
              "connect-src 'self' https://api.anthropic.com https://*.plaid.com wss://*.plaid.com",
              // Allow Plaid Link iframe worker scripts
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
