# SG Handyman Booking

Book handyman services in Singapore.

| Folder | App |
| --- | --- |
| `client/` | Vue 3 + Vite frontend, on http://localhost:5173 |
| `server/` | Express + MongoDB API, on http://localhost:8000 |

## Setup

1. Copy `server/.env.example` to `server/.env`. Fill in `DB` and `SECRET`.
2. Install the dependencies of both apps: `pnpm install:all`
3. Seed the timeslots and bookings: `pnpm seed`
4. Start both apps: `pnpm dev`

Each app still runs on its own. For example: `cd server && pnpm dev`.

## Testing

The end-to-end (E2E) tests use [Playwright](https://playwright.dev). They live in `client/e2e/`:

| Spec | User journey |
| --- | --- |
| `companies.spec.js` | Browse companies. Open a company page with its services and prices. |
| `auth.spec.js` | Log in, see an error for a wrong password, log out. |
| `booking.spec.js` | Book a free timeslot as a customer, then cancel it. Logged-out visitors see a log-in prompt. |
| `forum.spec.js` | Read the forum. Create a post, then delete it. |
| `business.spec.js` | A business owner sees the timeslot manager on their own company page. |

### Before you run the tests

1. Install the browser once: `pnpm --dir client exec playwright install chromium`
2. Make sure the test accounts exist in the database: `test-customer-1` and `test-business`, password `test-password-123`. `pnpm seed --with-test-users` creates them. **Warning:** the seed script also deletes all timeslots and bookings first, so do not run it on a shared database without asking your team.

Playwright starts the client (port 5173) and the server (port 8000) by itself. If they already run, it uses them.

### Run the tests

- All tests: `pnpm --dir client exec playwright test`
- Watch them in a browser: `pnpm --dir client exec playwright test --headed`
- Interactive mode: `pnpm --dir client exec playwright test --ui`
- The last HTML report: `pnpm --dir client exec playwright show-report`

The tests share one database, so they run one at a time. Every test that writes data removes it again, also when the test fails.

## History

This repository joins the history of the two earlier repositories, `sg-handyman-server` and `sg-handyman-client`. `git log -- server/` and `git log -- client/` show the full history of each app.
