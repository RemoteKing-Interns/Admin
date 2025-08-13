import { NextResponse } from 'next/server';
import { createPresignedUrl } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filename, contentType, brandName } = body;

    if (!filename || !contentType || !brandName) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'Filename, content type, and brand name are required' 
        },
        { status: 400 }
      );
    }
    
    // Sanitize the brand name for use in filenames
    const sanitizedBrandName = brandName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace special chars with hyphens
      .replace(/^-+|-+$/g, '');    // Remove leading/trailing hyphens
      
    // Get file extension from original filename
    const fileExtension = filename.split('.').pop();
    const key = `logos/${sanitizedBrandName}.${fileExtension}`;

    // Create a presigned URL for S3 upload
    const { url, fields } = await createPresignedUrl(key, contentType);

    return NextResponse.json({
      url,
      fields: {
        ...fields,
        key, // Include the key in the response
      },
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
