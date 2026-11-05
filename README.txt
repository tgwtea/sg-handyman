SG HANDYMAN BOOKING  -  IS216 Group Project (G5, Team 8)
====================================================================

Live application : https://sg-handyman.vercel.app
Source code      : https://github.com/tgwtea/sg-handyman
Presentation     : https://www.youtube.com/watch?si=-onIiRcwIN42shFK&v=bBZYex9hspA&feature=youtu.be  (also on the title slide)


1. WHAT THE APP DOES
--------------------
Customers in Singapore find a handyman company, compare the next free
timeslot, the distance and the starting price, then book a slot and leave
a review. The app also has a DIY forum and a small tool shop for small
fixes that do not need a professional.

Roles:
  - Guest     : browse companies, the forum and the shop.
  - Customer  : book and cancel timeslots, review a booking after its
                appointment ends, post in the forum, buy tools and
                review products.
  - Business  : manage the timeslots of its own company, cancel a
                customer's upcoming booking on its own slot, and manage
                shop products and orders.
  - Admin     : manage any company's timeslots, reject orders and remove
                product reviews.


2. TECHNOLOGIES
---------------
  Front end : Vue 3, Vue Router, Pinia, Vite, Bootstrap 5, Axios, Leaflet
  Back end  : Node.js, Express, express-session (cookie session), bcryptjs
  Data store: MongoDB (Mongoose). Sessions are also kept in MongoDB.
  Hosting   : Vercel (client at /, Express server at /api)
  Testing   : Playwright (end-to-end), Vitest (client unit),
              node:test (server unit)

External public API (asynchronous HTTP):
  - OneMap (Singapore Land Authority)
      * Search API      : turns a postal code into map coordinates.
      * Routing API     : driving distance from the user to each company
                          ("Free today near you" on the Home page).
      * Map tiles       : the company map on the company details page.
    The server calls OneMap and keeps the OneMap token secret. The
    browser calls our /api routes, which forward the request to OneMap.


3. DUMMY ACCOUNTS
-----------------
Every seeded password is the username followed by "123".

  Role      Username        Password
  --------  --------------  -----------------
  Admin     admin           admin123
  Customer  alicetan        alicetan123
  Customer  benlim          benlim123
  Business  tanrepair       tanrepair123      (manages "Tan Repair")
  Business  24hrsplumber    24hrsplumber123   (manages "24hrs Plumber SG")

E2E test accounts (password: test-password-123):
  test-customer-1, test-customer-2 (customers), test-business (Tan Repair)

The full list of accounts is in server/scripts/seed-data.js.


4. SET UP AND RUN LOCALLY
-------------------------
Requirements: Node.js 22 or later, pnpm, a MongoDB database
(MongoDB Atlas or a local server), and a free OneMap account
(https://www.onemap.gov.sg/apidocs/register).

  Step 1. Copy server/.env.example to server/.env.
  Step 2. In server/.env, set DB, SECRET, ONEMAP_API_EMAIL and
          ONEMAP_API_PASSWORD.
  Step 3. Install the packages. From the project root, run:
              pnpm install:all
  Step 4. Fill the database with the demo data:
              pnpm seed
          WARNING: this deletes all data in that database first.
  Step 5. Start the client and the server:
              pnpm dev
  Step 6. Open http://localhost:5173 in Google Chrome.
          The API runs on http://localhost:8000/api.

The client entry page is client/index.html.


5. RUN THE TESTS
----------------
Server unit tests (no database needed):
    pnpm --dir server test

Client unit tests:
    pnpm --dir client exec vitest run

End-to-end tests (Playwright):
    Step 1. Install the browser once:
                pnpm --dir client exec playwright install chromium
    Step 2. Run the tests (Playwright starts the client and the server
            if they are not already running):
                pnpm --dir client exec playwright test
    Step 3. Open the HTML report:
                pnpm --dir client exec playwright show-report

    The E2E tests use the database in server/.env and the E2E test
    accounts in section 3. Seed the database first.

Booking and timeslot database tests:
    These tests call the server code directly and need their own test
    database. They delete all timeslots, bookings, reviews and companies in
    it, so never point them at the real database. The tests refuse to run
    unless the database name ends in "_test". MongoDB creates the test
    database on the first run.

    Step 1. In server/.env, add a TEST_DB line. Copy the DB value and
            replace the database name "sg-handyman-booking" with
            "sg-handyman_test" (see server/.env.example).
    Step 2. Run the tests:
                pnpm --dir server test:timeslots

GitHub Actions runs the E2E tests on every push
(.github/workflows/e2e.yml).

E2E coverage (client/e2e):
  auth.spec.js          log in, log out, sign up, validation
  companies.spec.js     company list, details, side navigation
  home-helper.spec.js   "What needs fixing" helper journeys
  booking.spec.js       book and cancel a timeslot
  booking-race.spec.js  two customers book the same slot at once
  my-bookings.spec.js   My Bookings page
  reviews.spec.js       no review before the appointment ends; write,
                        edit and delete company reviews
  business.spec.js      business adds, edits and deletes timeslots, and
                        cancels a booking on its own slot
  forum.spec.js         posts, replies, likes, owner-only edit/delete
  shop.spec.js          search, filter, sort, cart, checkout, orders,
                        product reviews


6. KNOWN LIMITATIONS
--------------------
  - Shop payment and delivery are simulated. No real payment is made.
  - The company contact form is a demo and does not send a message.
  - The E2E tests use the shared team database.
  - The login limit (5 failed tries for one username from one
    address, then a 15-minute wait) is kept in server memory, so each
    Vercel server instance counts on its own.


7. USE OF AI / LLM TOOLS
------------------------
  - ChatGPT: generated seed and mock data
  - Claude: design mockup and UI prototyping
  - Antigravity: debugging, improving original code


8. THIRD-PARTY CODE AND ASSETS
------------------------------
  - Bootstrap 5, Vue 3, Leaflet and the OneMap Leaflet plug-in (open-source
    libraries, loaded from npm or a CDN).
  - Google Fonts: Pixelify Sans and Nunito.


9. TEAM
-------
  Tan Guan Wei  -  Homepage & Timeslot Booking
  Anumitaa Murali -  Verified Reviews & My Bookings Page
  Dillon Ang Jun Le  -  DIY Forum
  Lu Jia Hong  -  DIY Repair Tool Shop
  Kong Jia Zhen, Amanda  -  Company Listings & OneMap API
