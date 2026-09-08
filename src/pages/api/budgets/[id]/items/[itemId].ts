import type { APIRoute } from 'astro';
import db from '../../../../../lib/db';

export const PUT: APIRoute = async ({ params, request }) => {
  const { id: budgetId, itemId } = params;
  const item = db
    .prepare('SELECT * FROM budget_items WHERE id = ? AND budget_id = ?')
    .get(itemId, budgetId);
  if (!item) {
    return new Response(JSON.stringify({ error: 'Item no encontrado' }), { status: 404 });
  }

  const body = await request.json();
  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity < 1) {
    return new Response(JSON.stringify({ error: 'Cantidad inválida' }), { status: 400 });
  }

  db.prepare('UPDATE budget_items SET quantity = ? WHERE id = ?').run(Math.round(quantity), itemId);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const { id: budgetId, itemId } = params;
  const item = db
    .prepare('SELECT * FROM budget_items WHERE id = ? AND budget_id = ?')
    .get(itemId, budgetId);
  if (!item) {
    return new Response(JSON.stringify({ error: 'Item no encontrado' }), { status: 404 });
  }
  db.prepare('DELETE FROM budget_items WHERE id = ?').run(itemId);
  return new Response(null, { status: 204 });
};
