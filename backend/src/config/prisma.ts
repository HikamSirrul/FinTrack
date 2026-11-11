import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

let prismaClient: PrismaClient | undefined

/**
 * Initializes one Prisma Client per Worker isolate.
 *
 * Cloudflare Workers supplies the Hyperdrive connection string. Local Node.js
 * and Netlify deployments can continue using DATABASE_URL.
 */
export function initializePrisma(connectionString?: string): PrismaClient {
  if (!prismaClient) {
    const resolvedConnectionString =
      connectionString ?? process.env.DATABASE_URL

    if (!resolvedConnectionString) {
      throw new Error(
        'DATABASE_URL atau binding Hyperdrive belum dikonfigurasi.',
      )
    }

    prismaClient = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: resolvedConnectionString,
      }),
    })
  }

  return prismaClient
}

function getPrismaClient(): PrismaClient {
  return prismaClient ?? initializePrisma()
}

// Keep the existing route imports unchanged while initializing the client
// lazily. This preserves the current API route/business logic.
const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient()
    const value = Reflect.get(client, property, client)

    return typeof value === 'function' ? value.bind(client) : value
  },
})

export default prisma
