import db from './db';
import { nanoid } from 'nanoid';

export function parseImages(body: Record<string, unknown>): string[] {
  if (Array.isArray(body.images)) {
    return body.images.filter((p): p is string => typeof p === 'string' && p.length > 0);
  }
  if (typeof body.image_path === 'string' && body.image_path) {
    return [body.image_path];
  }
  return [];
}

export function saveProductImages(productId: string, images: string[]) {
  db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
  const insert = db.prepare(
    'INSERT INTO product_images (id, product_id, path, sort_order) VALUES (?, ?, ?, ?)'
  );
  images.forEach((path, i) => insert.run(nanoid(), productId, path, i));
}

export function getProductImages(productId: string): string[] {
  const rows = db
    .prepare('SELECT path FROM product_images WHERE product_id = ? ORDER BY sort_order ASC')
    .all(productId) as { path: string }[];
  return rows.map((r) => r.path);
}

export function attachImages<T extends { id: string }>(products: T[]): (T & { images: string[] })[] {
  if (products.length === 0) return [];
  const placeholders = products.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT product_id, path FROM product_images WHERE product_id IN (${placeholders}) ORDER BY sort_order ASC`
    )
    .all(...products.map((p) => p.id)) as { product_id: string; path: string }[];
  const byProduct = new Map<string, string[]>();
  for (const row of rows) {
    if (!byProduct.has(row.product_id)) byProduct.set(row.product_id, []);
    byProduct.get(row.product_id)!.push(row.path);
  }
  return products.map((p) => ({ ...p, images: byProduct.get(p.id) ?? [] }));
}
