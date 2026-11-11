# Deploy FinTrack API to Cloudflare Workers

This deployment keeps the existing Express routes, Prisma data model, and Supabase PostgreSQL database.

## Cloudflare resources

1. Create a Hyperdrive configuration connected to the existing Supabase PostgreSQL database.
2. Disable Hyperdrive query caching for this configuration. FinTrack serves personal financial records and requires fresh balances and read-after-write consistency.
3. Copy the Hyperdrive ID into `wrangler.jsonc`, replacing `REPLACE_WITH_HYPERDRIVE_ID`.
4. In the Worker settings, add:
   - Secret: `JWT_SECRET` (use the same value as the existing backend so current JWT sessions remain valid).
   - Variable: `FRONTEND_URL` (the exact Cloudflare Pages origin, including `https://`; no trailing slash).
5. Do not put database credentials or JWT secrets in Git.

## Supabase connection

Use the PostgreSQL connection string from Supabase. Hyperdrive needs a PostgreSQL connection string with the host, port, database name, username, and password. Use the Supabase connection details appropriate for external pooled connections and verify that the database network settings allow Cloudflare to connect.

The Hyperdrive connection string is configured in Cloudflare, not committed to this repository.

## Build and deploy

Run from the `backend` directory:

```bash
npm install
npm run cf-typegen
npm run build:worker
npm run deploy
```

For local Worker development, configure a local Hyperdrive connection string in Wrangler's local Hyperdrive settings, then run:

```bash
npm run dev:worker
```

The existing Node.js development command remains available:

```bash
npm run dev
```

## Connect the Cloudflare Pages frontend

After the Worker is deployed, copy its `workers.dev` URL and set the following variable in the Cloudflare Pages project:

- `VITE_API_URL`: `https://YOUR-WORKER-URL/api`

Trigger a new Pages deployment so the frontend build picks up the new API URL.

## Verify

After deployment, test:

- `GET /api/health`
- `GET /api/health/db`
- Register and login
- Authenticated profile endpoint `GET /api/auth/me`
- Accounts, categories, transactions, budgets, savings goals, and dashboard endpoints

## Important Free plan consideration

Cloudflare Workers Free has a 10 ms CPU-time limit per request. FinTrack currently uses bcryptjs with a work factor of 12 for password hashing and verification. Password endpoints must be tested on the deployed Free Worker; if they exceed the CPU limit, they can fail with a CPU-time-limit error. Do not reduce the password-hashing work factor without reviewing the security implications. Other routes may work normally even if registration/login needs a different hosting/runtime plan.
