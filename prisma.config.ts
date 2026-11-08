// Load environment variables from .env file
import 'dotenv/config'
import { defineConfig } from '@prisma/config'

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    // Use DIRECT_URL for migrations (direct connection, not pooled)
    // Falls back to DATABASE_URL if DIRECT_URL is not set
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
  migrations: {
    // Use direct URL for migrations to avoid pooling issues
    dbUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
})