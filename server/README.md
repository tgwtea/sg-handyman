# sg-handyman-server

Express + MongoDB API. All routes are under `/api` (for example `/api/companies`).

- Locally: `pnpm dev` serves it on http://localhost:8000/api.
- On Vercel: `server.js` exports the app, and the root `vercel.json` routes `/api/*` to it.
