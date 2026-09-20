import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const file = fd.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file field is required' }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: `Unsupported type ${file.type}` }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 25MB' }, { status: 413 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const meta = await sharp(buf).metadata();
    const ext = meta.format ?? 'bin';
    const name = `${randomUUID()}.${ext}`;

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, name), buf);

    const image = await db.image.create({
      data: {
        url: `/uploads/${name}`,
        width: meta.width ?? null,
        height: meta.height ?? null,
        alt: path.parse(file.name).name,
      },
    });
    return NextResponse.json({ image });
  } catch (e: any) {
    console.error('POST /api/upload error', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
