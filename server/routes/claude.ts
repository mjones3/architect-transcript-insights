import { Router, Request, Response } from 'express';
import {
  generateMeetingSummaryWithClaude,
  queryClaudeProjects,
  uploadTranscriptToClaudeProject
} from '../services/claudeAI';
import { getConfiguredProjects } from '../config/claudeProjects';

const router = Router();

// Generate meeting summary using Claude
router.post('/summarize', async (req: Request, res: Response) => {
  try {
    const { transcript } = req.body;
    
    if (!transcript || !Array.isArray(transcript)) {
      return res.status(400).json({ error: 'Invalid transcript data' });
    }
    
    const summary = await generateMeetingSummaryWithClaude(transcript);
    
    res.json(summary);
  } catch (error) {
    console.error('Summary generation error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Query Claude with project knowledge
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { question, projectIds } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    const response = await queryClaudeProjects(question, projectIds || []);
    
    res.json(response);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

// Upload transcript to Claude Projects
router.post('/upload-to-projects', async (req: Request, res: Response) => {
  try {
    const { transcript, summary, projectIds, filename } = req.body;
    
    if (!transcript || !projectIds || projectIds.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    await uploadTranscriptToClaudeProject(
      transcript,
      summary,
      projectIds,
      filename || `transcript-${Date.now()}.md`
    );
    
    res.json({ 
      success: true, 
      message: `Uploaded to ${projectIds.length} Claude projects`,
      projects: projectIds
    });
  } catch (error) {
    console.error('Upload to Claude Projects error:', error);
    res.status(500).json({ error: 'Failed to upload to Claude Projects' });
  }
});

// List available Claude Projects
router.get('/projects', async (req: Request, res: Response) => {
  try {
    // Get the user's configured Claude Projects
    const projects = getConfiguredProjects();
    
    if (projects.length === 0) {
      console.warn('⚠️  No Claude Projects configured!');
      console.warn('Please add your actual Claude Project IDs to CLAUDE_PROJECT_IDS in .env');
      console.warn('Then optionally configure display names in server/config/claudeProjects.ts');
    }
    
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

export default router;