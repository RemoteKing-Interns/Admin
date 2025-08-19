import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function createPresignedUrl(
  key: string,
  contentType: string,
  maxSizeMB = 5
) {
  try {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      throw new Error('AWS_S3_BUCKET environment variable is not set');
    }

    const params = {
      Bucket: bucket,
      Key: key,
      Fields: {
        'Content-Type': contentType,
      },
      Conditions: [
        ['content-length-range', 0, maxSizeMB * 1024 * 1024], // 5MB max file size
        { 'Content-Type': contentType },
      ] as any,
      Expires: 3600, // URL expires in 1 hour
    };
    
    console.log('Creating presigned URL with params:', JSON.stringify(params, null, 2));

    console.log('S3 Client Config:', {
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_S3_BUCKET,
      credentials: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY ? 'present' : 'missing'
    });

    const { url, fields } = await createPresignedPost(s3Client, params);
    console.log('Generated presigned POST data:', { url, fields: JSON.stringify(fields) });
    return { url, fields };
  } catch (error) {
    console.error('Error creating presigned URL:', error);
    throw error;
  }
}
