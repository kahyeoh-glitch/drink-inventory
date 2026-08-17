# Drink Inventory

Tracks bottled drinks sold at Grain — name, unit, and quantity on hand. Open access, no login.

## Stack

- Frontend: Vite + TypeScript, built to `dist/`.
- Backend: `worker/_worker.js`, a Cloudflare Worker (Pages Advanced Mode) serving `/api/drinks` and falling back to static assets. Copied into `dist/_worker.js` as part of the build.
- Data: Cloudflare D1 (`env.APP_DB`), schema created on first request.

## Develop

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

Outputs `dist/` (static assets + `_worker.js`).

## API

- `GET /api/drinks` — list all drinks
- `POST /api/drinks` — create `{ name, unit, quantity }`
- `PATCH /api/drinks/:id` — update any of `{ name, unit, quantity }`
- `DELETE /api/drinks/:id` — remove a drink
