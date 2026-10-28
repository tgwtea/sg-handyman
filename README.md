# SG Handyman Booking

Book handyman services in Singapore.

| Folder | App |
| --- | --- |
| `client/` | Vue 3 + Vite frontend, on http://localhost:5173 |
| `server/` | Express + MongoDB API, on http://localhost:8000 |

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

## Testing

The end-to-end (E2E) tests use [Playwright](https://playwright.dev). They live in `client/e2e/`:

| Spec | User journey |
| --- | --- |
| `companies.spec.js` | Browse companies. Open a company page with its services and prices. |
| `auth.spec.js` | Log in, see an error for a wrong password, log out. |
| `booking-race.spec.js` | Two customers book the same slot at the same time. Only one booking succeeds. The other gets a 409 message. `GET /timeslots/next-free` returns only future slots. |
| `booking.spec.js` | Book a free timeslot as a customer, then cancel it. Logged-out visitors see a log-in prompt. |
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

## Planned work

### "PUB Licensed" badge

The proposal promises a "PUB Licensed" badge on companies with PUB-licensed plumbers, and a filter for these companies. PUB (the national water agency) requires a licensed plumber for regulated plumbing work. The app does not support this yet.

To build it:

1. Add a licence number field to the company schema in `server/models/company-model.js`: `pubLicenceNo: { type: String, default: '' }`.
2. In `server/scripts/seed-data.js`, set a licence number for 24hrs Plumber SG, Lion City Plumbing Works, Pipeline Pros and Rapid Plumb Express. Leave Tan Repair and Fix-It-All Home Services without one.
3. Show the badge on the company cards when `pubLicenceNo` is not empty. Show the number on the company page, so owners can check it.
4. Add a "PUB licensed only" filter to the company list.

### "Earliest free timeslot" filter

`GET /timeslots/next-free` returns `[{ companyId, start }]`: the earliest free slot of each company. A company with no free slot is not in the list. Use it in `client/src/views/Companies.vue` to sort or filter the companies.

## History

This repository joins the history of the two earlier repositories, `sg-handyman-server` and `sg-handyman-client`. `git log -- server/` and `git log -- client/` show the full history of each app.
