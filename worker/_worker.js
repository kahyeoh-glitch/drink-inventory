const SCHEMA = `
CREATE TABLE IF NOT EXISTS drinks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function isValidQuantity(value) {
  return Number.isFinite(value) && value >= 0 && Number.isInteger(value);
}

async function ensureSchema(db) {
  await db.prepare(SCHEMA).run();
}

async function listDrinks(db) {
  const { results } = await db.prepare('SELECT * FROM drinks ORDER BY name').all();
  return json(results);
}

async function createDrink(db, request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const unit = String(body.unit || '').trim();
  const quantity = Number(body.quantity);

  if (!name || !unit) return json({ error: 'name and unit are required' }, 400);
  if (!isValidQuantity(quantity)) return json({ error: 'quantity must be a non-negative whole number' }, 400);

  const row = await db
    .prepare("INSERT INTO drinks (name, unit, quantity, updated_at) VALUES (?, ?, ?, datetime('now')) RETURNING *")
    .bind(name, unit, quantity)
    .first();

  return json(row, 201);
}

async function updateDrink(db, request, id) {
  const existing = await db.prepare('SELECT * FROM drinks WHERE id = ?').bind(id).first();
  if (!existing) return json({ error: 'drink not found' }, 404);

  const body = await request.json().catch(() => ({}));
  const name = body.name !== undefined ? String(body.name).trim() : existing.name;
  const unit = body.unit !== undefined ? String(body.unit).trim() : existing.unit;
  const quantity = body.quantity !== undefined ? Number(body.quantity) : existing.quantity;

  if (!name || !unit) return json({ error: 'name and unit are required' }, 400);
  if (!isValidQuantity(quantity)) return json({ error: 'quantity must be a non-negative whole number' }, 400);

  const row = await db
    .prepare("UPDATE drinks SET name = ?, unit = ?, quantity = ?, updated_at = datetime('now') WHERE id = ? RETURNING *")
    .bind(name, unit, quantity, id)
    .first();

  return json(row);
}

async function deleteDrink(db, id) {
  await db.prepare('DELETE FROM drinks WHERE id = ?').bind(id).run();
  return new Response(null, { status: 204 });
}

async function handleApi(request, env, url) {
  const db = env.APP_DB;
  await ensureSchema(db);

  const segments = url.pathname.split('/').filter(Boolean); // ['api', 'drinks', maybe id]

  if (segments[1] !== 'drinks') return json({ error: 'not found' }, 404);

  if (segments.length === 2) {
    if (request.method === 'GET') return listDrinks(db);
    if (request.method === 'POST') return createDrink(db, request);
    return json({ error: 'method not allowed' }, 405);
  }

  if (segments.length === 3) {
    const id = Number(segments[2]);
    if (!Number.isInteger(id)) return json({ error: 'invalid id' }, 400);
    if (request.method === 'PATCH') return updateDrink(db, request, id);
    if (request.method === 'DELETE') return deleteDrink(db, id);
    return json({ error: 'method not allowed' }, 405);
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
