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
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Fields: {
        'Content-Type': contentType,
      },
      Conditions: [
        ['content-length-range', 0, maxSizeMB * 1024 * 1024], // 5MB max file size
        ['starts-with', '$Content-Type', contentType],
      ],
      Expires: 3600, // URL expires in 1 hour
    };

    const { url, fields } = await createPresignedPost(s3Client, params);
    return { url, fields };
  } catch (error) {
    console.error('Error creating presigned URL:', error);
    throw error;
  }
}
