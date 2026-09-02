import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { requireAdmin } from '@/lib/apiAuth';
import { r2 } from '@/lib/r2Client';

// POST /api/upload/presign
// body: { filename, contentType, folder }
// Returns a short-lived signed PUT URL so the browser can upload large files
// (e.g. reel videos) straight to R2, without the file passing through your
// Next.js server. Replaces the old Cloudinary signature endpoint.
//
// NOTE: your R2 bucket's CORS config must allow PUT requests from your
// site's origin, or the browser upload in step 2 will fail. Cloudinary
// handled this for you automatically; R2 does not.
export const POST = requireAdmin(async (req) => {
  try {
    const { filename, contentType, folder = 'uploads' } = await req.json();
    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${folder}/${randomUUID()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    });

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 }); // 5 minutes
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (err) {
    console.error('Presign failed:', err);
    return NextResponse.json({ error: 'Could not create upload URL' }, { status: 500 });
  }
});