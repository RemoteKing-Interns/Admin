import { NextResponse } from 'next/server';
import { createPresignedUrl } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filename, contentType, brandName, folder = 'logos' } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'Filename and content type are required' 
        },
        { status: 400 }
      );
    }
    
    // Generate a unique filename
    const fileExtension = filename.split('.').pop()?.toLowerCase() || 'png';
    const uniqueId = uuidv4();
    
    // If brandName is provided, use it for the filename, otherwise use UUID
    let key: string;
    
    if (brandName) {
      // Sanitize the brand name for the filename
      const sanitizedBrandName = brandName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace special chars with hyphens
        .replace(/^-+|-+$/g, '')     // Remove leading/trailing hyphens
        .trim();
      
      key = `${folder}/${sanitizedBrandName}-${uniqueId}.${fileExtension}`;
    } else {
      key = `${folder}/${uniqueId}.${fileExtension}`;
    }

    console.log('Generating presigned URL with params:', {
      key,
      contentType,
      folder,
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION
    });

    // Create a presigned URL for S3 upload
    const { url, fields } = await createPresignedUrl(key, contentType);

    console.log('Generated presigned URL:', { url, fields });

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
