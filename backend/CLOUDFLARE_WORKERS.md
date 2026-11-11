# Deploy FinTrack Backend to Cloudflare Workers

Backend FinTrack can run as an Express application on Cloudflare Workers. The existing `src/server.ts` remains the local Node.js entrypoint; Cloudflare uses `src/worker.ts` instead.

## 1. Install dependencies

From the `backend` directory:

```bash
npm install
```

## 2. Configure secrets on Cloudflare

Open **Workers & Pages → fintrack-api → Settings → Variables and Secrets** and add these values:

| Name | Value |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string (prefer the Session Pooler connection string) |
| `JWT_SECRET` | The same strong secret used by the existing backend |
| `FRONTEND_URL` | The exact Cloudflare Pages frontend URL, e.g. `https://your-project.pages.dev` |

Mark `DATABASE_URL` and `JWT_SECRET` as **Secret**. Do not commit their values to GitHub. If the frontend uses a custom domain, include that origin in `FRONTEND_URL` as well. Multiple allowed origins can be comma-separated.

## 3. Deploy

From the `backend` directory, authenticate Wrangler and deploy:

```bash
npx wrangler login
npm run deploy:worker
```

Alternatively, connect the GitHub repository in Cloudflare Workers Builds and set the root directory to `backend`; the Wrangler configuration is `wrangler.jsonc`.

## 4. Test the API

After deployment, open:

- `https://fintrack-api.<your-account-subdomain>.workers.dev/api/health`
- `https://fintrack-api.<your-account-subdomain>.workers.dev/api/health/db`

The first endpoint checks the API process. The second checks the Supabase connection. Test login, registration, transactions, transfers, budgets, and savings goals before switching the frontend.

## 5. Connect Cloudflare Pages

In the Cloudflare Pages project, set the build environment variable:

```text
VITE_API_URL=https://fintrack-api.<your-account-subdomain>.workers.dev/api
```

Then redeploy the frontend. Keep the `/api` suffix in this value.

## Notes

- Prisma uses the JavaScript engine and `@prisma/adapter-pg` so no Rust query-engine binary is required in Workers.
- The database schema and existing API routes are unchanged.
- Cloudflare Workers Free has CPU and request quotas. Authentication uses bcrypt with 12 rounds, so verify registration and login under the Free CPU limit. If those requests exceed the CPU budget, we will need to tune the password-hashing approach or use a runtime with a larger CPU allowance.
- Keep the existing `DATABASE_URL`, `JWT_SECRET`, and local `.env` for local development; do not upload the `.env` file.
