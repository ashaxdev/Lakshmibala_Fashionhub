import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { requireAdmin } from '@/lib/apiAuth';
import { r2 } from '@/lib/r2Client';

// POST /api/upload/presign
// body: { filename, contentType, contentLength, folder }
// Returns a short-lived signed PUT URL so the browser can upload large files
// (e.g. reel videos) straight to R2, without the file passing through your
// Next.js server. Replaces the old Cloudinary signature endpoint.
//
// NOTE: your R2 bucket's CORS config must allow PUT requests from your
// site's origin, or the browser upload in step 2 will fail. Cloudinary
// handled this for you automatically; R2 does not.

// Allow-list rather than accepting whatever contentType the client
// claims — without this, this endpoint (even admin-gated) would happily
// hand out a signed URL for uploading anything, including files you
// never intended this route to store.
const ALLOWED_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

// A signed PUT URL alone doesn't cap upload size, so a mistaken (or
// mistakenly reused) client could upload something far larger than a
// reel video ever should be, which shows up later as unexpected R2
// storage/egress. Requiring the client to declare contentLength up front
// and pinning it on the signed command means R2 will reject any upload
// that doesn't match that exact size — most usefully, anything over it.
const MAX_BYTES = 200 * 1024 * 1024; // 200MB, generous for a short reel

// Folder is client-supplied and ends up directly in the object key, so
// keep it under a small known set of top-level namespaces rather than
// letting arbitrary strings (e.g. "../../something") shape where things
// land in the bucket. Nested paths are allowed under each namespace
// (e.g. "reels/videos", "reels/thumbnails") so callers can organize
// related uploads without widening what's actually allowed.
const ALLOWED_FOLDER_PREFIXES = ['uploads', 'reels', 'avatars', 'banners', 'combos'];

function isAllowedFolder(folder) {
  if (typeof folder !== 'string' || !folder || folder.includes('..')) return false;
  return ALLOWED_FOLDER_PREFIXES.some((prefix) => folder === prefix || folder.startsWith(`${prefix}/`));
}

const ONE_YEAR = 60 * 60 * 24 * 365;

export const POST = requireAdmin(async (req) => {
  try {
    const { filename, contentType, contentLength, folder = 'uploads' } = await req.json();

    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }
    if (!contentType || !ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json({ error: `Unsupported contentType: ${contentType}` }, { status: 400 });
    }
    if (!isAllowedFolder(folder)) {
      return NextResponse.json({ error: `Unsupported folder: ${folder}` }, { status: 400 });
    }
    if (!contentLength || typeof contentLength !== 'number' || contentLength <= 0) {
      return NextResponse.json({ error: 'contentLength (bytes) is required' }, { status: 400 });
    }
    if (contentLength > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max ${MAX_BYTES / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
    const key = `${folder}/${randomUUID()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
      // Key is a never-reused random UUID, so it's safe to cache forever
      // at the CDN/browser level — same pattern as the sharp-processed
      // image upload route.
      CacheControl: `public, max-age=${ONE_YEAR}, immutable`,
    });

    // These headers are baked into the signature, so the browser's PUT
    // request must send matching Content-Type / Content-Length headers
    // or R2 will reject the upload — that's what actually enforces the
    // allow-list and size cap above, not just this endpoint's own checks.
    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 }); // 5 minutes
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ uploadUrl, publicUrl, key, expiresIn: 300 });
  } catch (err) {
    console.error('Presign failed:', err);
    return NextResponse.json({ error: 'Could not create upload URL' }, { status: 500 });
  }
});