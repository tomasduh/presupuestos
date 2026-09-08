import type { APIRoute } from 'astro';
import { UPLOADS_DIR } from '../../../lib/db';
import { unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import sharp from 'sharp';

const FILENAME_RE = /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const imagePath = String(body.path ?? '');
  const filename = imagePath.replace(/^\/api\/uploads\//, '');
  const angle = body.direction === 'ccw' ? 270 : 90;

  if (!FILENAME_RE.test(filename)) {
    return new Response(JSON.stringify({ error: 'Ruta de imagen inválida' }), { status: 400 });
  }

  const full = path.join(UPLOADS_DIR, filename);

  try {
    const buffer = await sharp(full).rotate(angle).webp({ quality: 80 }).toBuffer();
    const newFilename = `${nanoid()}.webp`;
    await writeFile(path.join(UPLOADS_DIR, newFilename), buffer);
    await unlink(full).catch(() => {});
    return new Response(JSON.stringify({ path: `/api/uploads/${newFilename}` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'No se pudo rotar la imagen' }), { status: 400 });
  }
};
