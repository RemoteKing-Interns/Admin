import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Brand, { IBrand } from '@/models/Brand';

// Helper function to handle MongoDB ObjectId validation
const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

export async function GET() {
  try {
    await connectDB();
    const brands = await Brand.find({}).sort({ createdAt: -1 });
    return NextResponse.json(brands);
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, logoUrl } = await request.json();
    const trimmedName = name?.trim();

    if (!trimmedName || !logoUrl) {
      return NextResponse.json(
        { error: 'Brand name and logo are required' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Check for existing brand with the same name (case-insensitive)
    const existingBrand = await Brand.findOne({
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
    
    const brand = new Brand({
      name: trimmedName,
      logoUrl,
    });

    await brand.save();

    return NextResponse.json(brand, { status: 201 });
  } catch (error: any) {
    console.error('Error creating brand:', error);
    
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
        error: 'Failed to create brand',
        details: error.message || 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
}
