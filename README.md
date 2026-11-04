# SG Handyman Booking

Book handyman services in Singapore. Customers find a company, book a timeslot and leave a review. There is also a DIY forum and a small tool shop.

| Folder | App |
| --- | --- |
| `client/` | Vue 3 + Vite, on http://localhost:5173 |
| `server/` | Express + MongoDB, on http://localhost:8000/api |

## Setup

1. Copy `server/.env.example` to `server/.env`. Fill in `DB`, `SECRET` and the OneMap login.
2. `pnpm install:all`
3. `pnpm seed`
4. `pnpm dev`

**Warning:** `pnpm seed` deletes all data in the database first. The team shares one database, so ask before you run it.

After a seed, every password is the username followed by `123` (for example `admin` / `admin123`). The E2E test accounts `test-customer-1`, `test-customer-2` and `test-business` use `test-password-123`. The full list of accounts is in `server/scripts/seed-data.js`.

## Tests

```sh
pnpm --dir server test
```

```sh
TEST_DB=mongodb://localhost:27017/handyman_test pnpm --dir server test:timeslots
```

```sh
pnpm --dir client exec vitest run
```

```sh
pnpm --dir client exec playwright test
```

- `test` runs the unit tests. It needs no database.
- `test:timeslots` runs five booking and timeslot tests. It clears its collections first, so `TEST_DB` must be a separate database whose name ends in `_test`.
- The Playwright tests use the database in `server/.env` and the test accounts above. Run `pnpm --dir client exec playwright install chromium` once before the first run.

## Known limitations

- The server uses unique indexes, not transactions. Two bookings for one slot cannot both succeed. But an edit to a slot and a booking of it at the same moment can both go through.
- Shop payment and delivery are simulated.
- The E2E tests and CI use the shared team database.

## Deploy

`vercel.json` deploys the client at `/` and the server at `/api/*`. Set `DB`, `SECRET` and the OneMap login in the Vercel project.
