import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Model from '@/models/Model';

interface ModelType {
  _id: mongoose.Types.ObjectId;
  name: string;
  brandId: string | mongoose.Types.ObjectId;
  imageUrl: string;
  description?: string;
}

// Helper function to handle MongoDB ObjectId validation
const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

// GET /api/brands/[brandId]/models - Get all models for a specific brand
export async function GET(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    const { brandId } = params;
    console.log('Fetching models for brand ID:', brandId);
    
    if (!isValidObjectId(brandId)) {
      console.error('Invalid brand ID format:', brandId);
      return NextResponse.json(
        { error: 'Invalid brand ID' },
        { status: 400 }
      );
    }

    await connectDB();
    
    try {
      // First, check what collections exist
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      console.log('Available collections:', collections.map(c => c.name));
      
      // Get a sample of models to see the structure
      const modelsCollection = db.collection('models');
      const sampleModel = await modelsCollection.findOne({});
      console.log('Sample model document:', JSON.stringify(sampleModel, null, 2));
      
      // Try to find models with different approaches
      let models: any[] = [];
      
      // 1. Try with Model.find first
      try {
        console.log('Trying Model.find with brandId as string...');
        models = await Model.find({ brandId })
          .sort({ name: 1 })
          .lean();
        console.log(`Found ${models.length} models using Model.find with string ID`);
      } catch (err) {
        console.error('Error with Model.find (string ID):', err);
      }
      
      // 2. If no models found, try with ObjectId
      if (models.length === 0) {
        try {
          console.log('Trying Model.find with brandId as ObjectId...');
          models = await Model.find({ 
            brandId: new mongoose.Types.ObjectId(brandId) 
          })
          .sort({ name: 1 })
          .lean();
          console.log(`Found ${models.length} models using Model.find with ObjectId`);
        } catch (err) {
          console.error('Error with Model.find (ObjectId):', err);
        }
      }
      
      // 3. If still no models, try direct collection access
      if (models.length === 0) {
        try {
          console.log('Trying direct collection access with string ID...');
          models = await modelsCollection
            .find({ brandId })
            .sort({ name: 1 })
            .toArray();
          console.log(`Found ${models.length} models using direct collection access with string ID`);
        } catch (err) {
          console.error('Error with direct collection access (string ID):', err);
        }
      }
      
      // 4. Try direct collection access with ObjectId
      if (models.length === 0) {
        try {
          console.log('Trying direct collection access with ObjectId...');
          models = await modelsCollection
            .find({ brandId: new mongoose.Types.ObjectId(brandId) })
            .sort({ name: 1 })
            .toArray();
          console.log(`Found ${models.length} models using direct collection access with ObjectId`);
        } catch (err) {
          console.error('Error with direct collection access (ObjectId):', err);
        }
      }
      
      console.log(`Total models found: ${models.length}`);
      
      // Log the first model's structure if any found
      if (models.length > 0) {
        console.log('First model structure:', JSON.stringify(models[0], null, 2));
      }
      
      // Convert ObjectId to string for JSON serialization
      const serializedModels = models.map((model: any) => ({
        ...model,
        _id: model._id.toString(),
        brandId: model.brandId?.toString() || model.brandId
      }));
      
      return NextResponse.json(serializedModels);
      
    } catch (error: unknown) {
      console.error('Database error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      return NextResponse.json(
        { 
          error: 'Failed to fetch models',
          details: errorMessage,
          stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in models API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/brands/[brandId]/models - Create a new model for a specific brand
export async function POST(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    const { brandId } = params;
    const data = await request.json();
    const { name, description, imageUrl } = data;

    // Validate input
    if (!name || !imageUrl) {
      return NextResponse.json(
        { error: 'Name and image URL are required' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Create new model
    const newModel = new Model({
      name,
      description: description || '',
      imageUrl,
      brandId,
    });

    const savedModel = await newModel.save();

    return NextResponse.json(
      { message: 'Model created successfully', model: savedModel },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating model:', error);
    return NextResponse.json(
      { error: 'Failed to create model' },
      { status: 500 }
    );
  }
}
