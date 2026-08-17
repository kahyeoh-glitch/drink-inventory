function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function fetchSeedAsset(env, requestUrl, path) {
  const assetUrl = new URL(path, requestUrl);
  const res = await env.ASSETS.fetch(new Request(assetUrl));
  if (!res.ok) throw new Error(`missing seed asset ${path}`);
  return res.json();
}

async function loadSeed(env, requestUrl) {
  const drinks = await fetchSeedAsset(env, requestUrl, '/seed/drinks.json');
  const manifest = await fetchSeedAsset(env, requestUrl, '/seed/manifest.json');

  const sales = [];
  for (let i = 0; i < manifest.chunkCount; i++) {
    const chunk = await fetchSeedAsset(env, requestUrl, `/seed/sales-${i}.json`);
    sales.push(...chunk);
  }

  return { drinks, sales };
}

async function ensureSchema(db) {
  await db
    .prepare('CREATE TABLE IF NOT EXISTS drinks (code TEXT PRIMARY KEY, name TEXT NOT NULL)')
    .run();
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS sales (drink_code TEXT NOT NULL, sale_date TEXT NOT NULL, quantity INTEGER NOT NULL, PRIMARY KEY (drink_code, sale_date))'
    )
    .run();
}

async function ensureSeeded(db, env, requestUrl) {
  const row = await db.prepare('SELECT COUNT(*) as count FROM sales').first();
  if (row.count > 0) return;

  const seed = await loadSeed(env, requestUrl);

  const drinkStmts = seed.drinks.map((d) =>
    db.prepare('INSERT OR IGNORE INTO drinks (code, name) VALUES (?, ?)').bind(d.code, d.name)
  );
  await db.batch(drinkStmts);

  const CHUNK = 20;
  const BATCH_SIZE = 50;
  const saleStmts = [];
  for (let i = 0; i < seed.sales.length; i += CHUNK) {
    const chunk = seed.sales.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => '(?, ?, ?)').join(', ');
    const values = chunk.flat();
    saleStmts.push(
      db
        .prepare(`INSERT OR IGNORE INTO sales (drink_code, sale_date, quantity) VALUES ${placeholders}`)
        .bind(...values)
    );
  }
  for (let i = 0; i < saleStmts.length; i += BATCH_SIZE) {
    await db.batch(saleStmts.slice(i, i + BATCH_SIZE));
  }
}

async function getMeta(db) {
  const row = await db
    .prepare(
      'SELECT MIN(sale_date) as min_date, MAX(sale_date) as max_date, COUNT(DISTINCT drink_code) as drink_count FROM sales'
    )
    .first();
  return json(row);
}

async function listDrinks(db) {
  const { results } = await db.prepare('SELECT code, name FROM drinks ORDER BY name').all();
  return json(results);
}

async function getSalesForDate(db, date) {
  const { results } = await db
    .prepare(
      `SELECT d.code, d.name, COALESCE(s.quantity, 0) as quantity
       FROM drinks d
       LEFT JOIN sales s ON s.drink_code = d.code AND s.sale_date = ?
       ORDER BY quantity DESC, d.name`
    )
    .bind(date)
    .all();
  return json(results);
}

async function handleApi(request, env, url) {
  const db = env.APP_DB;
  await ensureSchema(db);
  await ensureSeeded(db, env, url);

  const segments = url.pathname.split('/').filter(Boolean); // ['api', ...]
  const resource = segments[1];

  if (resource === 'meta' && segments.length === 2 && request.method === 'GET') {
    return getMeta(db);
  }

  if (resource === 'drinks' && segments.length === 2 && request.method === 'GET') {
    return listDrinks(db);
  }

  if (resource === 'sales' && segments.length === 2 && request.method === 'GET') {
    const date = url.searchParams.get('date');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ error: 'date=YYYY-MM-DD query param is required' }, 400);
    }
    return getSalesForDate(db, date);
  }

  return json({ error: 'not found' }, 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : 'internal error' }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
