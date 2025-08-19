import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Model from '@/models/Model';

// Helper to validate 24-char hex ObjectIds
const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

// Normalize a document for JSON
function serialize(doc: any) {
  if (!doc) return null;
  return {
    ...doc,
    _id: doc._id?.toString?.() ?? doc._id,
    brandId: doc.brandId?.toString?.() ?? doc.brandId,
  };
}

// GET /api/brands/[brandId]/models/[modelId] - fetch a single model
export async function GET(
  _req: NextRequest,
  { params }: { params: { brandId: string; modelId: string } }
) {
  try {
    const { brandId, modelId } = params;

    if (!isValidObjectId(modelId) || !isValidObjectId(brandId)) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });
    }

    await connectDB();

    // Try with brandId as string, then as ObjectId for compatibility
    let model = await Model.findOne({ _id: modelId, brandId }).lean();
    if (!model) {
      model = await Model.findOne({
        _id: new mongoose.Types.ObjectId(modelId),
        brandId: new mongoose.Types.ObjectId(brandId),
      }).lean();
    }

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    return NextResponse.json(serialize(model));
  } catch (error) {
    console.error('Error fetching model:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch model', details: msg }, { status: 500 });
  }
}

// PUT /api/brands/[brandId]/models/[modelId] - update a model
export async function PUT(
  req: NextRequest,
  { params }: { params: { brandId: string; modelId: string } }
) {
  try {
    const { brandId, modelId } = params;
    if (!isValidObjectId(modelId) || !isValidObjectId(brandId)) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });
    }

    const { name, description = '', imageUrl } = await req.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await connectDB();

    const update: any = {
      name,
      description,
    };
    if (imageUrl) update.imageUrl = imageUrl;

    const updated = await Model.findOneAndUpdate(
      { _id: modelId, brandId },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      // Retry with ObjectId brandId in case the stored type differs
      const updatedAlt = await Model.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(modelId), brandId: new mongoose.Types.ObjectId(brandId) },
        { $set: update },
        { new: true, runValidators: true }
      ).lean();

      if (!updatedAlt) {
        return NextResponse.json({ error: 'Model not found' }, { status: 404 });
      }

      return NextResponse.json(serialize(updatedAlt));
    }

    return NextResponse.json(serialize(updated));
  } catch (error) {
    console.error('Error updating model:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update model', details: msg }, { status: 500 });
  }
}

// DELETE /api/brands/[brandId]/models/[modelId] - delete a model
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { brandId: string; modelId: string } }
) {
  try {
    const { brandId, modelId } = params;
    if (!isValidObjectId(modelId) || !isValidObjectId(brandId)) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });
    }

    await connectDB();

    const deleted = await Model.findOneAndDelete({ _id: modelId, brandId }).lean();
    if (!deleted) {
      const deletedAlt = await Model.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(modelId),
        brandId: new mongoose.Types.ObjectId(brandId),
      }).lean();
      if (!deletedAlt) {
        return NextResponse.json({ error: 'Model not found' }, { status: 404 });
      }
      return NextResponse.json({ message: 'Model deleted', model: serialize(deletedAlt) });
    }

    return NextResponse.json({ message: 'Model deleted', model: serialize(deleted) });
  } catch (error) {
    console.error('Error deleting model:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete model', details: msg }, { status: 500 });
  }
}
