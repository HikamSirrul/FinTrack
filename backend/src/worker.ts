import { env } from 'cloudflare:workers'
import { httpServerHandler } from 'cloudflare:node'
import app from './app.js'
import { initializePrisma } from './config/prisma.js'

// Cloudflare Workers provides these values through bindings/secrets.
// Keep the Express routes and business logic shared with local/Netlify builds.
app.locals.FRONTEND_URL = env.FRONTEND_URL ?? ''
app.locals.JWT_SECRET = env.JWT_SECRET

// Hyperdrive provides a pooled PostgreSQL connection to the existing Supabase DB.
initializePrisma(env.HYPERDRIVE.connectionString)

// Express is hosted through Cloudflare's Node.js HTTP server adapter.
app.listen(3000)

export default httpServerHandler({ port: 3000 })
