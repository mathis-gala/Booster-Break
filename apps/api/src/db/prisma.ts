import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = Bun.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required to start the API')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter })

export type AppPrisma = typeof prisma
