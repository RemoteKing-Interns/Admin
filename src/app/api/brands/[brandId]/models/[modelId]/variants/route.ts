import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Variant from '@/models/Variant';
import mongoose, { isValidObjectId } from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: { brandId: string; modelId: string } }
) {
  const { brandId, modelId } = params;

  // We only need modelId to pull variants under that model
  if (!isValidObjectId(modelId)) {
    return NextResponse.json({ error: 'Invalid modelId' }, { status: 400 });
  }

  try {
    await dbConnect();

    // Query by modelId only to return all variants for the model
    let variants = await Variant.find({ modelId })
      .sort({ name: 1 })
      .lean();

    // Fallback in case modelId type mismatch exists in DB
    if (!variants.length) {
      variants = await Variant.find({ modelId: new mongoose.Types.ObjectId(modelId) })
        .sort({ name: 1 })
        .lean();
    }

    return NextResponse.json(variants, { status: 200 });
  } catch (error) {
    console.error('Error fetching variants:', error);
    return NextResponse.json({ error: 'Failed to fetch variants' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { brandId: string; modelId: string } }
) {
  const { brandId, modelId } = params;

  if (!isValidObjectId(brandId) || !isValidObjectId(modelId)) {
    return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
  }

  try {
    await dbConnect();

    const body = await req.json();
    const {
      name,
      rkid,
      imageUrl,
      images,
      vehicleInfo,
      keyBladeProfiles,
      programmingInfo,
      pathways,
      resources,
    } = body as any;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const doc: any = {
      name,
      brandId: new mongoose.Types.ObjectId(brandId),
      modelId: new mongoose.Types.ObjectId(modelId),
    };

    if (rkid) doc.rkid = rkid;
    if (imageUrl) doc.imageUrl = imageUrl;
    if (images && typeof images === 'object') doc.images = images;
    if (vehicleInfo) doc.vehicleInfo = vehicleInfo;
    if (keyBladeProfiles) doc.keyBladeProfiles = keyBladeProfiles;
    if (programmingInfo) doc.programmingInfo = programmingInfo;
    if (pathways) doc.pathways = pathways;
    if (resources) doc.resources = resources;

    const created = await Variant.create(doc);
    const obj = created.toObject ? created.toObject() : created;
    return NextResponse.json(obj, { status: 201 });
  } catch (error) {
    console.error('Error creating variant:', error);
    return NextResponse.json({ error: 'Failed to create variant' }, { status: 500 });
  }
}
