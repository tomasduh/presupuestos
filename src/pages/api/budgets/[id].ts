import type { APIRoute } from 'astro';
import db from '../../../lib/db';

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
  if (!budget) {
    return new Response(JSON.stringify({ error: 'Presupuesto no encontrado' }), { status: 404 });
  }

  const items = db
    .prepare(
      `SELECT bi.id, bi.quantity, bi.product_id,
        p.name, p.price, p.image_path, p.category_id,
        c.name as category_name
       FROM budget_items bi
       JOIN products p ON p.id = bi.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE bi.budget_id = ?
       ORDER BY bi.created_at ASC`
    )
    .all(id);

  return new Response(JSON.stringify({ ...budget, items }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params;
  const existing = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Presupuesto no encontrado' }), { status: 404 });
  }

  const body = await request.json();
  const name = String(body.name ?? '').trim();

  if (!name) {
    return new Response(JSON.stringify({ error: 'El nombre es requerido' }), { status: 400 });
  }

  db.prepare('UPDATE budgets SET name = ? WHERE id = ?').run(name, id);

  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
  return new Response(JSON.stringify(budget), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;
  const existing = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Presupuesto no encontrado' }), { status: 404 });
  }
  db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
  return new Response(null, { status: 204 });
};
