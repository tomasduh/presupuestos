import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import sharp from 'sharp';

const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const uploadsDir = path.join(dataDir, 'uploads');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

export const UPLOADS_DIR = uploadsDir;

const db = new Database(path.join(dataDir, 'app.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL DEFAULT 0,
    image_path TEXT,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS budget_items (
    id TEXT PRIMARY KEY,
    budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(budget_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS product_images (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function migrateExistingProductImages() {
  const products = db
    .prepare(
      `SELECT p.id, p.image_path FROM products p
       WHERE p.image_path IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id)`
    )
    .all() as { id: string; image_path: string }[];
  const insert = db.prepare(
    'INSERT INTO product_images (id, product_id, path, sort_order) VALUES (?, ?, ?, 0)'
  );
  for (const p of products) {
    insert.run(nanoid(), p.id, p.image_path);
  }
}

migrateExistingProductImages();

const LEGACY_IMAGE_EXT = /\.(jpe?g|png|gif)$/i;

async function migrateImagesToWebp() {
  const files = await readdir(UPLOADS_DIR).catch(() => [] as string[]);
  const legacyFiles = files.filter((f) => LEGACY_IMAGE_EXT.test(f));
  if (legacyFiles.length === 0) return;

  const updateProductImages = db.prepare('UPDATE product_images SET path = ? WHERE path = ?');
  const updateLegacyProducts = db.prepare('UPDATE products SET image_path = ? WHERE image_path = ?');

  for (const file of legacyFiles) {
    const oldPath = `/api/uploads/${file}`;
    const newFile = file.replace(LEGACY_IMAGE_EXT, '.webp');
    const newPath = `/api/uploads/${newFile}`;
    try {
      const buffer = await sharp(path.join(UPLOADS_DIR, file), { animated: true })
        .rotate()
        .webp({ quality: 80 })
        .toBuffer();
      await writeFile(path.join(UPLOADS_DIR, newFile), buffer);
      updateProductImages.run(newPath, oldPath);
      updateLegacyProducts.run(newPath, oldPath);
      await unlink(path.join(UPLOADS_DIR, file));
    } catch (err) {
      console.error(`No se pudo convertir ${file} a webp`, err);
    }
  }
}

await migrateImagesToWebp();

// One-time recovery fix: the first version of migrateImagesToWebp() converted
// legacy images without applying EXIF auto-rotation, so most photos (taken in
// portrait) were saved sideways and the sources were already deleted. This
// re-rotates the affected files exactly once, using a manually verified list
// of the images that were already correctly oriented. Safe to delete once
// applied (guarded by a marker file so it never runs twice).
const ROTATION_FIX_MARKER = path.join(dataDir, '.rotation-fix-2026-09-applied');
const ROTATION_FIX_SKIP = new Set([
  'uRkCpUQH6YwPt-hBtZeFP.webp',
  'AqYcNjBc4oHKGAKrF5lvb.webp',
  'S8GOykyhqTBtkCRoelmef.webp',
  'cUwiDEW-NZyKTHjLev4zo.webp',
  'dkwS9aVkTunVxRVBXR1vh.webp',
]);

async function fixImageRotationOneTime() {
  if (existsSync(ROTATION_FIX_MARKER)) return;

  const files = await readdir(UPLOADS_DIR).catch(() => [] as string[]);
  const webpFiles = files.filter((f) => f.endsWith('.webp'));

  for (const file of webpFiles) {
    const angle = ROTATION_FIX_SKIP.has(file) ? 0 : 90;
    if (angle === 0) continue;
    const full = path.join(UPLOADS_DIR, file);
    try {
      const buffer = await sharp(full).rotate(angle).webp({ quality: 80 }).toBuffer();
      await writeFile(full, buffer);
    } catch (err) {
      console.error(`No se pudo corregir la rotación de ${file}`, err);
    }
  }

  await writeFile(ROTATION_FIX_MARKER, new Date().toISOString());
}

await fixImageRotationOneTime();

function seed() {
  const categoryCount = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c;
  if (categoryCount === 0) {
    const insertCategory = db.prepare('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)');
    const categories = [
      'Cocina',
      'Electrodomésticos pequeños',
      'Electrodomésticos grandes',
      'Muebles',
      'Baño',
      'Limpieza y organización',
      'Otros',
    ];
    const ids: Record<string, string> = {};
    categories.forEach((name, i) => {
      const id = nanoid();
      ids[name] = id;
      insertCategory.run(id, name, i);
    });

    const productCount = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c;
    if (productCount === 0) {
      const insertProduct = db.prepare(
        'INSERT INTO products (id, name, price, category_id) VALUES (?, ?, ?, ?)'
      );
      const seedProducts: [string, number, string][] = [
        ['Bajilla concreto', 295000, 'Cocina'],
        ['Bajilla oslo', 240000, 'Cocina'],
        ['Vasos de vidrio Cristar', 43000, 'Cocina'],
        ['Vasos de vidrio Luna', 29000, 'Cocina'],
        ['Jarra plástica', 85000, 'Cocina'],
        ['Jarra azul', 40000, 'Cocina'],
        ['Jarra de vidrio', 21000, 'Cocina'],
        ['Set especiadores', 70000, 'Cocina'],
        ['Cubiertos Capri Black', 160000, 'Cocina'],
        ['Clips para bolsas', 12000, 'Limpieza y organización'],
        ['Guante horno', 30000, 'Cocina'],
        ['Tabla para picar', 40000, 'Cocina'],
        ['Tapers', 40000, 'Cocina'],
        ['Set utensilios', 120000, 'Cocina'],
        ['Cuchillo BRZ G', 72000, 'Cocina'],
        ['Cuchillos HC par', 65000, 'Cocina'],
        ['Cuchillo Imusa', 80000, 'Cocina'],
        ['Olla a presión', 400000, 'Electrodomésticos pequeños'],
        ['Microondas', 340000, 'Electrodomésticos pequeños'],
        ['Freidora 7L Imusa', 500000, 'Electrodomésticos pequeños'],
        ['Freidora 7.5L Imusa', 390000, 'Electrodomésticos pequeños'],
        ['Freidora B&D 5.5L', 320000, 'Electrodomésticos pequeños'],
        ['Freidora Oster 6L', 377000, 'Electrodomésticos pequeños'],
        ['Sanduchera', 160000, 'Electrodomésticos pequeños'],
        ['Sanduchera grande', 240000, 'Electrodomésticos pequeños'],
        ['Licuadora Ninja Pack Procesadora', 700000, 'Electrodomésticos pequeños'],
        ['Licuadora Ninja Pack Smoothie', 700000, 'Electrodomésticos pequeños'],
        ['Licuadora Imusa', 380000, 'Electrodomésticos pequeños'],
        ['Comedor 6 puestos', 2200000, 'Muebles'],
        ['Sofá', 2600000, 'Muebles'],
        ['Papelera', 60000, 'Limpieza y organización'],
        ['Papelera Medal', 85000, 'Limpieza y organización'],
        ['Papelera negra', 90000, 'Limpieza y organización'],
        ['Horno', 1133000, 'Electrodomésticos grandes'],
        ['Estufa 7', 830000, 'Electrodomésticos grandes'],
        ['Estufa 3', 840000, 'Electrodomésticos grandes'],
        ['Nevera 621L', 4612000, 'Electrodomésticos grandes'],
        ['Aire 12 BTU', 2000000, 'Electrodomésticos grandes'],
        ['Lava-secadora LG 16/8kg', 3480000, 'Electrodomésticos grandes'],
        ['Lavadora 23kg Samsung', 2300000, 'Electrodomésticos grandes'],
        ['Lavadora 23kg LG', 2400000, 'Electrodomésticos grandes'],
      ];
      for (const [name, price, categoryName] of seedProducts) {
        insertProduct.run(nanoid(), name, price, ids[categoryName]);
      }
    }
  }
}

seed();

export default db;
