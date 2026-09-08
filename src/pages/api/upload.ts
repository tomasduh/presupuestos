import type { APIRoute } from 'astro';
import { UPLOADS_DIR } from '../../lib/db';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get('image');

  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'No se envió ninguna imagen' }), { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
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

  const filename = `${nanoid()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOADS_DIR, filename), buffer);

  return new Response(JSON.stringify({ path: `/api/uploads/${filename}` }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
