import { Router, Request, Response } from 'express';
import { saveTranscriptToS3, getProjectTranscripts, getTranscriptContent } from '../services/awsS3';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Save transcript
router.post('/save', async (req: Request, res: Response) => {
  try {
    const { filename, content, projectIds, metadata } = req.body;
    
    if (!filename || !content || !projectIds || projectIds.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Try to save to S3
    try {
      const url = await saveTranscriptToS3(filename, content, projectIds, metadata);
      return res.json({ success: true, url, storage: 's3' });
    } catch (s3Error) {
      console.error('S3 save failed, falling back to local storage:', s3Error);
      
      // Fallback to local storage
      const localDir = path.join(process.cwd(), 'saved-transcripts');
      await fs.mkdir(localDir, { recursive: true });
      
      const localPath = path.join(localDir, filename);
      await fs.writeFile(localPath, content, 'utf-8');
      
      return res.json({ success: true, path: localPath, storage: 'local' });
    }
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save transcript' });
  }
});

// Get project transcripts
router.get('/projects/:projectId/transcripts', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    const transcripts = await getProjectTranscripts(projectId);
    
    res.json(transcripts);
  } catch (error) {
    console.error('Get transcripts error:', error);
    res.status(500).json({ error: 'Failed to get transcripts' });
  }
});

// Get transcript content
router.get('/transcripts/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    const content = await getTranscriptContent(key);
    
    res.json({ content });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Failed to get transcript content' });
  }
});

export default router;