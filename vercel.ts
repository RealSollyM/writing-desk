import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  // Next.js App Router project
  framework: 'nextjs',

  // Rewrite API routes to Next.js handlers
  rewrites: [
    routes.rewrite('/api/(.*)', '/api/$1'),
  ],

  // Cache static assets
  headers: [
    routes.cacheControl('/static/(.*)', {
      public: true,
      maxAge: '1 year',
      immutable: true,
    }),
    routes.cacheControl('/_next/static/(.*)', {
      public: true,
      maxAge: '1 year',
      immutable: true,
    }),
  ],

  // Environment variable configuration
  env: {
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!,
    DATABASE_URL: process.env.DATABASE_URL!,
    ARCJET_KEY: process.env.ARCJET_KEY!,
  },

  // Build and development settings
  buildCommand: 'pnpm build',
  outputDirectory: '.next',
};

export default config;