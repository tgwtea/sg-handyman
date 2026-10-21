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

## History

This repository joins the history of the two earlier repositories, `sg-handyman-server` and `sg-handyman-client`. `git log -- server/` and `git log -- client/` show the full history of each app.
