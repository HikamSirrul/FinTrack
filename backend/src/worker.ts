import { httpServerHandler } from 'cloudflare:node'
import { env } from 'cloudflare:workers'

// Make the Hyperdrive-managed connection string available before the app
// and Prisma client are imported. Local Node.js development continues to use
// DATABASE_URL from the local environment via src/server.ts.
process.env.DATABASE_URL = env.HYPERDRIVE.connectionString

const { default: app } = await import('./app.js')

// Express is hosted by the Workers Node.js HTTP bridge.
const server = app.listen(3000)

export default httpServerHandler(server)
