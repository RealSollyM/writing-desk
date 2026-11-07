// Load environment variables from .env file
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeonHttp } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Neon HTTP adapter for serverless environments
// This handles connection pooling automatically for Vercel/Cloudflare
const neonAdapter = new PrismaNeonHttp(
  // Use pooled connection URL for runtime queries (DATABASE_URL)
  // Falls back to DIRECT_URL if DATABASE_URL is not set
  process.env.DATABASE_URL || process.env.DIRECT_URL!,
  {
    // HTTP query options
    arrayMode: false,
    fullResults: false,
  }
)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    adapter: neonAdapter,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma