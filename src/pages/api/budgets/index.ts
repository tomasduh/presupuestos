import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import { nanoid } from 'nanoid';

export const GET: APIRoute = async () => {
  const budgets = db
    .prepare(
      `SELECT b.*,
        COALESCE(SUM(p.price * bi.quantity), 0) as total,
        COALESCE(SUM(bi.quantity), 0) as item_count
       FROM budgets b
       LEFT JOIN budget_items bi ON bi.budget_id = b.id
       LEFT JOIN products p ON p.id = bi.product_id
       GROUP BY b.id
       ORDER BY b.created_at DESC`
    )
    .all();
  return new Response(JSON.stringify(budgets), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const name = String(body.name ?? '').trim();

  if (!name) {
    return new Response(JSON.stringify({ error: 'El nombre es requerido' }), { status: 400 });
  }

  const id = nanoid();
  db.prepare('INSERT INTO budgets (id, name) VALUES (?, ?)').run(id, name);

  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
  return new Response(JSON.stringify(budget), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
