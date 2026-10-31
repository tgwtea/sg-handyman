# sg-handyman-server

Express + MongoDB API. All routes are under `/api` (for example `/api/companies`).

- Locally: `pnpm dev` serves it on http://localhost:8000/api.
- On Vercel: `server.js` exports the app, and the root `vercel.json` routes `/api/*` to it.

## OneMap

1. Register and confirm an account at https://www.onemap.gov.sg/apidocs/register.
2. Copy `.env.example` to `.env` for local use.
3. Set `ONEMAP_API_EMAIL` and `ONEMAP_API_PASSWORD` to the account credentials.
4. Set the same secrets in each deployment environment before release.

The server uses the existing `DB` connection to store one token in the `service_tokens` collection.
The database account needs read and write access to this collection.
The server creates the document automatically. No migration is necessary.
The server renews the token on demand when fewer than five minutes remain.
A database lock prevents simultaneous renewals across server instances.
No scheduled task is necessary. The server no longer uses `ONEMAP_API_TOKEN`.
Keep credentials and database tokens out of source control and logs.

Run `pnpm test` from `server` to check token renewal and postal-code search with simulated OneMap responses.
