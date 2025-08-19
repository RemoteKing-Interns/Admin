import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Brand from '@/models/Brand';

// Helper function to handle MongoDB ObjectId validation
const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

// GET /api/brands/[brandId] - Get single brand by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    const { brandId } = params;
    
    if (!isValidObjectId(brandId)) {
      return NextResponse.json(
        { error: 'Invalid brand ID' },
        { status: 400 }
      );
    }

    await connectDB();
    const brand = await Brand.findById(brandId);

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(brand);
  } catch (error) {
    console.error('Error fetching brand:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand' },
      { status: 500 }
    );
  }
}

// PUT /api/brands/[brandId] - Update a brand
export async function PUT(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    const { brandId } = params;
    
    if (!isValidObjectId(brandId)) {
      return NextResponse.json(
        { error: 'Invalid brand ID' },
        { status: 400 }
      );
    }

    const { name, logoUrl } = await request.json();
    const trimmedName = name?.trim();

    if (!trimmedName || !logoUrl) {
      return NextResponse.json(
        { error: 'Brand name and logo are required' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Check for existing brand with the same name (excluding current brand)
    const existingBrand = await Brand.findOne({
      _id: { $ne: brandId },
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    });

    if (existingBrand) {
      return NextResponse.json(
        { 
          error: 'Brand already exists',
          details: `A brand with the name "${existingBrand.name}" already exists`
        },
        { status: 409 } // 409 Conflict
      );
    }

    const updatedBrand = await Brand.findByIdAndUpdate(
      brandId,
      { 
        name: trimmedName,
        logoUrl,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedBrand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedBrand);
  } catch (error: any) {
    console.error('Error updating brand:', error);
    
    // Handle duplicate key error (in case unique index fails)
    if (error.code === 11000 || error.code === 11001) {
      return NextResponse.json(
        { 
          error: 'Brand already exists',
          details: 'A brand with this name already exists in the system'
        },
        { status: 409 } // 409 Conflict
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to update brand',
        details: error.message || 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
}
