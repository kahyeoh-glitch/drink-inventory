# Drink Inventory

Shows how many bottles of each Grain drink sold on a given day. Pick a date, see quantities per drink. Open access, no login.

Data is real historical sales for Grain's 29 bottled drinks (cold-pressed juices, coconut waters, cold brews, lattes, etc.), sourced from Grain's internal sales records and covering 2014-11-17 through 2020-03-25.

## Stack

- Frontend: Vite + TypeScript, built to `dist/`.
- Backend: `worker/_worker.js`, a Cloudflare Worker (Pages Advanced Mode) serving `/api/*` and falling back to static assets. Copied into `dist/_worker.js` as part of the build. Embeds the seed dataset (drinks + daily sales) and loads it into D1 on first request.
- Data: Cloudflare D1 (`env.APP_DB`).

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

- `GET /api/meta` — `{ min_date, max_date, drink_count }` for the available date range
- `GET /api/drinks` — list of `{ code, name }` for all tracked drinks
- `GET /api/sales?date=YYYY-MM-DD` — quantity sold per drink on that date (0 for drinks with no sale that day)
