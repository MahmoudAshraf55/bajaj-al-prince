/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('ws', '@whiskeysockets/baileys', 'qrcode', 'bufferutil', 'utf-8-validate');
    }
    return config;
  },
  async rewrites() {
    return [
      { source: '/api/products/:path*', destination: '/api/v1/products/:path*' },
      { source: '/api/cashier/:path*', destination: '/api/v1/cashier/:path*' },
      { source: '/api/bookings/:path*', destination: '/api/v1/bookings/:path*' },
      { source: '/api/contact/:path*', destination: '/api/v1/contact/:path*' },
      { source: '/api/customers/:path*', destination: '/api/v1/customers/:path*' },
      { source: '/api/vehicles/:path*', destination: '/api/v1/vehicles/:path*' },
      { source: '/api/vehicle-models/:path*', destination: '/api/v1/vehicle-models/:path*' },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-eval'${isDev ? " 'unsafe-inline'" : ''}; style-src 'self'${isDev ? " 'unsafe-inline'" : ''}; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' blob: https://raw.githack.com https://raw.githubusercontent.com; frame-src 'self' https://www.tiktok.com https://www.youtube.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
