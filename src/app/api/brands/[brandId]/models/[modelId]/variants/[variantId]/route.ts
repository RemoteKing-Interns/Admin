import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Variant from '@/models/Variant';

const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

function serialize(doc: any) {
  if (!doc) return null;
  return {
    ...doc,
    _id: doc._id?.toString?.() ?? doc._id,
    brandId: doc.brandId?.toString?.() ?? doc.brandId,
    modelId: doc.modelId?.toString?.() ?? doc.modelId,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { brandId: string; modelId: string; variantId: string } }
) {
  try {
    const { variantId, modelId } = params;
    if (!isValidObjectId(variantId) || !isValidObjectId(modelId)) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });
    }

    await connectDB();

    let variant = await Variant.findOne({ _id: variantId, modelId }).lean();
    if (!variant) {
      variant = await Variant.findOne({
        _id: new mongoose.Types.ObjectId(variantId),
        modelId: new mongoose.Types.ObjectId(modelId),
      }).lean();
    }

    if (!variant) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
    }

    return NextResponse.json(serialize(variant));
  } catch (error) {
    console.error('Error fetching variant:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch variant', details: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { brandId: string; modelId: string; variantId: string } }
) {
  try {
    const { variantId, modelId } = params;
    if (!isValidObjectId(variantId) || !isValidObjectId(modelId)) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });
    }

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
      newModelId,
    } = body as any;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await connectDB();

    const update: any = { name };
    if (rkid) update.rkid = rkid;
    if (imageUrl) update.imageUrl = imageUrl;
    if (images && typeof images === 'object') {
      update.images = {};
      if (images.car) update.images.car = images.car;
    }
    if (vehicleInfo) update.vehicleInfo = vehicleInfo;
    if (keyBladeProfiles) update.keyBladeProfiles = keyBladeProfiles;
    if (programmingInfo) {
      const ensureDefaults = (opt: any) => ({
        name: (opt?.name && String(opt.name).trim()) || 'Not Applicable',
        Color: (opt?.Color && String(opt.Color).trim()) || 'Not Applicable',
        models: Array.isArray(opt?.models) && opt.models.length ? opt.models : ['Not Applicable'],
      });
      const normalized: any = {};
      for (const k of [
        'remoteOptions','keyBladeOptions','cloningOptions','allKeysLost','addSpareKey','addRemote','pinRequired','pinReading','remoteProgramming'
      ]) {
        const list = programmingInfo[k];
        if (Array.isArray(list) && list.length) normalized[k] = list.map(ensureDefaults);
        else normalized[k] = [ensureDefaults({})];
      }
      update.programmingInfo = normalized;
    }
    if (pathways) update.pathways = pathways;
    if (resources) update.resources = resources;
    if (newModelId) {
      if (!isValidObjectId(newModelId)) {
        return NextResponse.json({ error: 'Invalid newModelId' }, { status: 400 });
      }
      update.modelId = new mongoose.Types.ObjectId(newModelId);
    }

    let updated = await Variant.findOneAndUpdate(
      { _id: variantId, modelId },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      updated = await Variant.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(variantId), modelId: new mongoose.Types.ObjectId(modelId) },
        { $set: update },
        { new: true, runValidators: true }
      ).lean();
    }

    if (!updated) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
    }

    return NextResponse.json(serialize(updated));
  } catch (error) {
    console.error('Error updating variant:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update variant', details: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { brandId: string; modelId: string; variantId: string } }
) {
  try {
    const { variantId, modelId } = params;
    if (!isValidObjectId(variantId) || !isValidObjectId(modelId)) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });
    }

    await connectDB();

    let deleted = await Variant.findOneAndDelete({ _id: variantId, modelId }).lean();
    if (!deleted) {
      deleted = await Variant.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(variantId),
        modelId: new mongoose.Types.ObjectId(modelId),
      }).lean();
    }

    if (!deleted) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Variant deleted', variant: serialize(deleted) });
  } catch (error) {
    console.error('Error deleting variant:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete variant', details: msg }, { status: 500 });
  }
}
