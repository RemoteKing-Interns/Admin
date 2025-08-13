import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Brand from '@/models/Brand';

// Helper function to handle MongoDB ObjectId validation
const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

// DELETE /api/brands/[id]/delete - Delete a brand
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid brand ID' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Find and delete the brand
    const deletedBrand = await Brand.findByIdAndDelete(id);

    if (!deletedBrand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Note: We're intentionally not deleting the logo from S3 as per requirements
    // The logo will remain in the S3 bucket

    return NextResponse.json(
      { success: true, message: 'Brand deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting brand:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete brand',
        details: error instanceof Error ? error.message : 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
}
