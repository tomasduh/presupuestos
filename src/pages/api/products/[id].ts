import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { UPLOADS_DIR } from '../../../lib/db';
import { attachImages, getProductImages, parseImages, saveProductImages } from '../../../lib/productImages';

export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params as { id: string };
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Producto no encontrado' }), { status: 404 });
  }

  const body = await request.json();
  const name = String(body.name ?? '').trim();
  const price = Number(body.price);
  const categoryId = body.category_id ? String(body.category_id) : null;
  const images = body.images !== undefined || body.image_path !== undefined
    ? parseImages(body)
    : getProductImages(id);

  if (!name) {
    return new Response(JSON.stringify({ error: 'El nombre es requerido' }), { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0) {
    return new Response(JSON.stringify({ error: 'El precio debe ser un número válido' }), {
      status: 400,
    });
  }

  db.prepare('UPDATE products SET name = ?, price = ?, category_id = ?, image_path = ? WHERE id = ?').run(
    name,
    Math.round(price),
    categoryId,
    images[0] ?? null,
    id
  );
  saveProductImages(id, images);

  const product = db
    .prepare(
      `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`
    )
    .get(id) as { id: string };
  return new Response(JSON.stringify(attachImages([product])[0]), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params as { id: string };
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Producto no encontrado' }), { status: 404 });
  }
  const images = getProductImages(id);
  db.prepare('DELETE FROM products WHERE id = ?').run(id);

  for (const imagePath of images) {
    const filename = imagePath.split('/').pop();
    if (filename) {
      try {
        await unlink(path.join(UPLOADS_DIR, filename));
      } catch {
        // el archivo ya no existe, no pasa nada
      }
    }
  }

  return new Response(null, { status: 204 });
};
