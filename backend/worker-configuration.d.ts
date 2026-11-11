// Cloudflare Worker bindings used by src/worker.ts.
// Run `npm run cf-typegen` after configuring Hyperdrive to refresh generated types.
interface Env {
  HYPERDRIVE: Hyperdrive
  JWT_SECRET: string
  FRONTEND_URL: string
}
