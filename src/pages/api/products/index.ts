import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import { nanoid } from 'nanoid';
import { attachImages, parseImages, saveProductImages } from '../../../lib/productImages';

export const GET: APIRoute = async () => {
  const products = db
    .prepare(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ORDER BY p.created_at DESC`
    )
    .all() as { id: string }[];
  return new Response(JSON.stringify(attachImages(products)), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const name = String(body.name ?? '').trim();
  const price = Number(body.price);
  const categoryId = body.category_id ? String(body.category_id) : null;
  const images = parseImages(body);

  if (!name) {
    return new Response(JSON.stringify({ error: 'El nombre es requerido' }), { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0) {
    return new Response(JSON.stringify({ error: 'El precio debe ser un número válido' }), {
      status: 400,
    });
  }

  const id = nanoid();
  db.prepare(
    'INSERT INTO products (id, name, price, category_id, image_path) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, Math.round(price), categoryId, images[0] ?? null);
  saveProductImages(id, images);

  const product = db
    .prepare(
      `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`
    )
    .get(id) as { id: string };
  return new Response(JSON.stringify(attachImages([product])[0]), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
