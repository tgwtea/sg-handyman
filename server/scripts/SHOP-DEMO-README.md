# Shop demo data

Purpose: populate only the shop catalogue and clearly marked sample reviews, without running the team database-reset seed.

The first population uses 19 of the existing 25 companies (76%, nearest whole-company value to 75%), with 1–5 tools each. It preserves the six existing product IDs and prices, repairs their obsolete company references, fills empty detail fields, and adds the remaining tools. Products use matching original SVG illustrations in client/public/shop-tools.

Reviews begin with [Demo review] and belong to six dedicated shop-demo-reviewer accounts. The script creates matching historical sample purchases only for those accounts. Existing users' passwords/carts, existing orders/reviews, companies, bookings, forum posts and company reviews are not edited. Demo account passwords are randomly generated and hashed; they are not published login credentials.

## Files

- populate-shop.js: preview/apply utility. This is setup automation, not code called by the frontend.
- shop-tool-data.json: 16 product templates, descriptions, specifications and relative image paths.
- ../../client/public/shop-tools/*.svg: matching original tool illustrations (not product photographs).

## Use from the server folder

```powershell
node scripts/populate-shop.js
node scripts/populate-shop.js --apply
```

The first command prepares or reads a saved preview without changing database records. The second applies that same plan. Do not use the team's pnpm seed command for this task: that command resets other sections.

The private plan/backup and final verification report are under server/node_modules/.cache/woody-shop-demo/. They are not source files to commit; the plan contains hashed demo passwords and original product snapshots. Keep it if you might need to rerun/recover this batch. A rerun with the same plan avoids duplicate records and does not overwrite subsequent product edits. If the database is reset and companies receive new IDs, the script stops rather than pointing records at missing companies. Do not delete the plan and rerun against an existing batch.

Images use http://localhost:5173/shop-tools/... because the current product form requires a complete HTTP image URL. The illustrations are served from your own frontend. For a future deployed dataset, set SHOP_IMAGE_ORIGIN to the real frontend origin BEFORE preparing a fresh plan. Existing plans retain their original URLs. Deploying the current local URLs unchanged will not make those images available to other visitors.

The setup utility uses MongoDB's driver, filesystem operations, random data and password hashing. These are setup details rather than additional concepts needed to understand the shopping interface. It changes no routes, controllers, Vue files, dependencies or Git author information. No commit or push is performed.
