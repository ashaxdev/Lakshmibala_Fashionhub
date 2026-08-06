import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const POST = requireAdmin(async (req) => {
  const { folder = 'uploads' } = await req.json();
  const timestamp = Math.round(Date.now() / 1000);

  // Only sign the params you're actually sending — must match the upload call exactly
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET
  );

  return NextResponse.json({
    timestamp,
    signature,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
});