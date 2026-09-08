import type { APIRoute } from 'astro';
import db from '../../../../lib/db';
import { nanoid } from 'nanoid';

export const POST: APIRoute = async ({ params, request }) => {
  const { id: budgetId } = params;
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(budgetId);
  if (!budget) {
    return new Response(JSON.stringify({ error: 'Presupuesto no encontrado' }), { status: 404 });
  }

  const body = await request.json();
  const productId = String(body.product_id ?? '');
  const quantity = Number(body.quantity ?? 1);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) {
    return new Response(JSON.stringify({ error: 'Producto no encontrado' }), { status: 404 });
  }

  const existingItem = db
    .prepare('SELECT * FROM budget_items WHERE budget_id = ? AND product_id = ?')
    .get(budgetId, productId) as { id: string; quantity: number } | undefined;

  if (existingItem) {
    db.prepare('UPDATE budget_items SET quantity = quantity + ? WHERE id = ?').run(
      Math.max(1, Math.round(quantity)),
      existingItem.id
    );
  } else {
    db.prepare(
      'INSERT INTO budget_items (id, budget_id, product_id, quantity) VALUES (?, ?, ?, ?)'
    ).run(nanoid(), budgetId, productId, Math.max(1, Math.round(quantity)));
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
