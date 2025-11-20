import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'architect-transcripts';

export async function saveTranscriptToS3(
  filename: string,
  content: string,
  projectIds: string[],
  metadata: any
): Promise<string> {
  try {
    // Save to S3 with project tags
    const key = `transcripts/${projectIds[0]}/${filename}`;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: content,
      ContentType: 'text/markdown',
      Metadata: {
        ...metadata,
        projects: projectIds.join(','),
        timestamp: new Date().toISOString(),
      },
      Tagging: `project=${projectIds.join(',')}&type=transcript`,
    });

    await s3Client.send(command);
    
    // Generate presigned URL for download
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
    
    return url;
  } catch (error) {
    console.error('S3 save error:', error);
    throw error;
  }
}

export async function getProjectTranscripts(projectId: string): Promise<any[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `transcripts/${projectId}/`,
      MaxKeys: 100,
    });

    const response = await s3Client.send(command);
    
    if (!response.Contents) {
      return [];
    }

    return response.Contents.map(item => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
      filename: item.Key?.split('/').pop(),
    }));
  } catch (error) {
    console.error('S3 list error:', error);
    return [];
  }
}

export async function getTranscriptContent(key: string): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    const content = await response.Body?.transformToString();
    
    return content || '';
  } catch (error) {
    console.error('S3 get error:', error);
    throw error;
  }
}