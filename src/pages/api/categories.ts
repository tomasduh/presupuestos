import type { APIRoute } from 'astro';
import db from '../../lib/db';
import { nanoid } from 'nanoid';

export const GET: APIRoute = async () => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC').all();
  return new Response(JSON.stringify(categories), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const name = String(body.name ?? '').trim();
  if (!name) {
    return new Response(JSON.stringify({ error: 'El nombre es requerido' }), { status: 400 });
  }
  const maxOrder = (
    db.prepare('SELECT MAX(sort_order) as m FROM categories').get() as { m: number | null }
  ).m;
  const id = nanoid();
  try {
    db.prepare('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)').run(
      id,
      name,
      (maxOrder ?? -1) + 1
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Ya existe una categoría con ese nombre' }), {
      status: 400,
    });
  }
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  return new Response(JSON.stringify(category), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
