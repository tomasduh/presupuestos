import type { APIRoute } from 'astro';
import { UPLOADS_DIR } from '../../lib/db';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import sharp from 'sharp';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const WEBP_QUALITY = 80;

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get('image');

  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'No se envió ninguna imagen' }), { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return new Response(JSON.stringify({ error: 'Formato de imagen no soportado' }), {
      status: 400,
    });
  }

  const maxSize = 8 * 1024 * 1024; // 8MB
  if (file.size > maxSize) {
    return new Response(JSON.stringify({ error: 'La imagen no puede pesar más de 8MB' }), {
      status: 400,
    });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBuffer, { animated: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch {
    return new Response(JSON.stringify({ error: 'No se pudo procesar la imagen' }), {
      status: 400,
    });
  }

  const filename = `${nanoid()}.webp`;
  await writeFile(path.join(UPLOADS_DIR, filename), outputBuffer);

  return new Response(JSON.stringify({ path: `/api/uploads/${filename}` }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
