# SG Handyman Booking

Book handyman services in Singapore.

| Folder | App |
| --- | --- |
| `client/` | Vue 3 + Vite frontend, on http://localhost:5173 |
| `server/` | Express + MongoDB API, on http://localhost:8000/api (the Vite dev server proxies /api to it) |

## Features

The platform gives new BTO owners two paths: book a professional, or fix a small job themselves.

- **Company listings:** browse the companies and search by name, category or service. Each card shows the company's rating, and each company page lists its services with starting prices.
- **Live appointment booking:** timeslots refresh every second. When two customers pick the same slot, only the first booking succeeds, and the other customer sees a clear message.
- **My Bookings:** customers see their upcoming and past bookings across all companies, and can cancel upcoming ones.
- **Verified reviews:** only customers with a booking can leave a review. See [Reviews](#reviews).
- **DIY forum:** users write posts, reply to each other and like posts.
- **DIY tool shop:** users add tools to a cart, check out (payment is simulated) and follow the delivery.
- **Timeslot management:** a business account manages the timeslots of its own company. An admin manages them for every company.

## Setup

1. Copy `server/.env.example` to `server/.env`. Fill in `DB` and `SECRET`.
2. Install the dependencies of both apps: `pnpm install:all`
3. Seed the database: `pnpm seed`
4. Start both apps: `pnpm dev`

Each app still runs on its own. For example: `cd server && pnpm dev`.

## Seed data

`pnpm seed` rebuilds the whole database from `server/scripts/seed-data.js`. It creates:

- 25 companies, with their services and starting prices
- 38 accounts (see [Accounts](#accounts))
- 75 reviews by the customer accounts
- weekday timeslots from 09:00 to 18:00 (Singapore time) for today and the next 14 days. Today's slots start after the time of the seed, so an urgent repair can find a same-day slot.
- random bookings on about 30% of those timeslots

**Warning:** `pnpm seed` first deletes **all** data in the database: users, companies, reviews, timeslots, bookings, forum posts and shop orders. Everyone on the team and the CI tests use the same database. Ask your team before you run it. Log in again after a seed, because the old sessions point to deleted users.

To change the seed data, edit `server/scripts/seed-data.js`, run `pnpm seed`, and update the tables below.

## Accounts

These accounts exist after `pnpm seed`. Each password is the username followed by `123`, except the test accounts.

| Role | What the account can do |
| --- | --- |
| Admin | Add, edit and delete timeslots for every company. Cancel any booking. |
| Business | Add, edit and delete timeslots for its own company only. |
| Customer | Book and cancel its own bookings. |

Every account can write forum posts and buy from the shop.

### Admin

| Username | Password |
| --- | --- |
| `admin` | `admin123` |

### Business accounts (one for each company)

| Username | Password | Company |
| --- | --- | --- |
| `24hrsplumber` | `24hrsplumber123` | 24hrs Plumber SG |
| `tanrepair` | `tanrepair123` | Tan Repair |
| `lioncityplumbing` | `lioncityplumbing123` | Lion City Plumbing Works |
| `woodcraft` | `woodcraft123` | Woodcraft Carpentry SG |
| `tilesandgrout` | `tilesandgrout123` | Tiles & Grout Pro |
| `keymaster` | `keymaster123` | KeyMaster Locksmith |
| `coolbreeze` | `coolbreeze123` | CoolBreeze Aircon Services |
| `brightspark` | `brightspark123` | BrightSpark Electrical |
| `homefix` | `homefix123` | HomeFix Handyman Services |
| `freshcoat` | `freshcoat123` | Fresh Coat Painters |
| `arcticair` | `arcticair123` | Arctic Air Aircon |
| `polarcomfort` | `polarcomfort123` | Polar Comfort Aircon |
| `tiledoctor` | `tiledoctor123` | Tile Doctor SG |
| `ohmsweetohm` | `ohmsweetohm123` | Ohm Sweet Ohm Electricians |
| `fixitall` | `fixitall123` | Fix-It-All Home Services |
| `greenleaf` | `greenleaf123` | GreenLeaf Pest Control |
| `pipelinepros` | `pipelinepros123` | Pipeline Pros |
| `voltmasters` | `voltmasters123` | Volt Masters Electrical |
| `colourmehome` | `colourmehome123` | Colour Me Home Painting |
| `securelock` | `securelock123` | Secure Lock & Key |
| `handyandy` | `handyandy123` | Handy Andy SG |
| `oakandnail` | `oakandnail123` | Oak & Nail Carpentry |
| `rapidplumb` | `rapidplumb123` | Rapid Plumb Express |
| `premierwall` | `premierwall123` | Premier Wall Finishes |
| `sparkleglass` | `sparkleglass123` | Sparkle Glass & Windows |

### Customer accounts

| Username | Password |
| --- | --- |
| `alicetan` | `alicetan123` |
| `benlim` | `benlim123` |
| `chloeng` | `chloeng123` |
| `danielwong` | `danielwong123` |
| `emilyhoo` | `emilyhoo123` |
| `farahrahman` | `farahrahman123` |
| `gokulraj` | `gokulraj123` |
| `hannahlee` | `hannahlee123` |
| `jasminekoh` | `jasminekoh123` |

### Test accounts (used by the E2E tests)

| Username | Password | Role | Company |
| --- | --- | --- | --- |
| `test-customer-1` | `test-password-123` | Customer | |
| `test-customer-2` | `test-password-123` | Customer | |
| `test-business` | `test-password-123` | Business | Tan Repair |

These passwords are for local testing only. Change them before you deploy the app to a public server.

## Reviews

- A customer can review each of their bookings once. The review form lists the bookings at that company that have no review yet.
- The server rejects a review for a booking that is not the customer's own, or that already has a review.
- Only the author can edit a review. The author or an admin can delete it. A business account can do neither.
- Cancelling a booking also deletes its review, so every review stays tied to a real booking.
- Each review shows the service of its booking. Seeded reviews have no linked booking, so they show the customer's latest booking at that company, or no service if there is none.
- `GET /reviews/company/:companyId` returns a company's reviews and the bookings that the logged-in customer can still review.
- `GET /reviews/summary` returns `[{ companyId, average, count }]`, which the company cards use to show ratings.

## Testing

The end-to-end (E2E) tests use [Playwright](https://playwright.dev). They live in `client/e2e/`:

| Spec | User journey |
| --- | --- |
| `companies.spec.js` | Browse companies. Open a company page with its services and prices. |
| `auth.spec.js` | Log in, see an error for a wrong password, log out. |
| `booking-race.spec.js` | Two customers book the same slot at the same time. Only one booking succeeds. The other gets a 409 message. A customer's selected slot flashes red with a warning when another customer books it. `GET /timeslots/next-free` returns only future slots. |
| `booking.spec.js` | Book a free timeslot as a customer, then cancel it. Logged-out visitors see a log-in prompt when they click a free slot. |
| `forum.spec.js` | Read the forum. Create a post, then delete it. |
| `business.spec.js` | A business owner sees the timeslot manager on their own company page. |

### Before you run the tests

1. Install the browser once: `pnpm --dir client exec playwright install chromium`
2. Make sure the [test accounts](#test-accounts-used-by-the-e2e-tests) exist in the database. `pnpm seed` creates them. See the warning in [Seed data](#seed-data) before you run it.

Playwright starts the client (port 5173) and the server (port 8000) by itself. If they already run, it uses them.

### Run the tests

- All tests: `pnpm --dir client exec playwright test`
- Watch them in a browser: `pnpm --dir client exec playwright test --headed`
- Interactive mode: `pnpm --dir client exec playwright test --ui`
- The last HTML report: `pnpm --dir client exec playwright show-report`

The tests share one database, so they run one at a time. Every test that writes data removes it again, also when the test fails.

### Continuous integration (CI)

GitHub Actions runs the E2E tests on every push (`.github/workflows/e2e.yml`). The results are on the repository's **Actions** tab. Each run attaches the HTML report as the `playwright-report` artifact.

One-time setup, done by a repository admin:

1. Add two repository secrets in **Settings > Secrets and variables > Actions**:
   - `E2E_DB`: the MongoDB connection string, in the same format as `DB` in `server/.env`.
   - `E2E_SECRET`: any long random string.
2. In MongoDB Atlas, open **Network Access** and allow `0.0.0.0/0`. GitHub runners do not have fixed IP addresses.

Runs wait for each other, because all of them use the same database.

## History

This repository joins the history of the two earlier repositories, `sg-handyman-server` and `sg-handyman-client`. `git log -- server/` and `git log -- client/` show the full history of each app.

## Deploy on Vercel

`vercel.json` deploys the repo as one Vercel project with two services:

| Service | Folder | Public path |
| --- | --- | --- |
| `client` | `client/` (Vite) | `/` |
| `server` | `server/` (Express) | `/api/*` |

Set `DB` and `SECRET` in the Vercel project's environment variables. `CLIENT_ORIGIN` isn't needed, because the client and API share one domain. Sessions are stored in MongoDB (the `sessions` collection), so every function instance sees the same logins.

To run both services together the way Vercel does, run `vercel dev` from the repo root.
