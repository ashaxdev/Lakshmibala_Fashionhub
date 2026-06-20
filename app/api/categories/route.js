export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Category from '@/models/Category';
import slugify from 'slugify';
import { requireAdmin } from '@/lib/apiAuth';

export async function GET() {
  await dbConnect();
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  return NextResponse.json({ categories });
}

export const POST = requireAdmin(async (req) => {
  await dbConnect();
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
  const slug = body.slug ? slugify(body.slug, { lower: true }) : slugify(body.name, { lower: true });
  const exists = await Category.findOne({ slug });
  if (exists) return NextResponse.json({ error: 'A category with this slug already exists' }, { status: 409 });
  const category = await Category.create({ ...body, slug });
  return NextResponse.json({ category }, { status: 201 });
});
