import { PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { requireAdmin } from '@/lib/apiAuth';
import { r2 } from '@/lib/r2Client';

// Admin-only upload route. Mirrors the original requireAdmin route,
// but now does the resizing/compression work ONCE here with sharp
// instead of asking Vercel's Image Optimization to do it on every
// request/breakpoint at serve time. Combined with `unoptimized: true`
// in next.config.js, this is what stops Image Optimization usage from
// scaling with traffic.

const MAX_WIDTH = 1600;     // plenty for a full-bleed PDP image on any screen
const WEBP_QUALITY = 80;    // good visual quality / size tradeoff for product photos
const ONE_YEAR = 60 * 60 * 24 * 365;

export const POST = requireAdmin(async (req) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    // Resize (never upscale) + transcode to WebP. This is the step
    // that used to happen implicitly, repeatedly, and billably on
    // Vercel's edge every time a different width/format was requested.
    const optimizedBuffer = await sharp(inputBuffer)
      .rotate() // respect EXIF orientation before stripping metadata
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const key = `${folder}/${randomUUID()}.webp`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: optimizedBuffer,
        ContentType: 'image/webp',
        // Content-addressed-ish (random UUID key, never reused), so it's
        // safe to cache forever at the CDN/browser level.
        CacheControl: `public, max-age=${ONE_YEAR}, immutable`,
      })
    );

    const url = `${process.env.R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ url, key });
  } catch (err) {
    console.error('R2 upload failed:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
});