export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import Category from '@/models/Category';
import { requireAdmin } from '@/lib/apiAuth';

// POST /api/categories/reorder
// body: { ids: ['id1', 'id2', ...] }  -> ids in the desired display order
// (send one sibling group at a time: all top-level, or all children of one parent)
export const POST = requireAdmin(async (req) => {
  await dbConnect();
  const { ids } = await req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
  }
  if (!ids.every((id) => mongoose.isValidObjectId(id))) {
    return NextResponse.json({ error: 'Invalid category id' }, { status: 400 });
  }

  await Category.bulkWrite(
    ids.map((id, index) => ({
      updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } },
    }))
  );

  return NextResponse.json({ success: true });
});