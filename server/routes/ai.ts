import { Router, Request, Response } from 'express';
import { generateMeetingSummary, queryKnowledgeBase } from '../services/awsBedrock';

const router = Router();

// Generate meeting summary
router.post('/summarize', async (req: Request, res: Response) => {
  try {
    const { transcript } = req.body;
    
    if (!transcript || !Array.isArray(transcript)) {
      return res.status(400).json({ error: 'Invalid transcript data' });
    }
    
    const summary = await generateMeetingSummary(transcript);
    
    res.json(summary);
  } catch (error) {
    console.error('Summary generation error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Query architecture knowledge
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { question, projectIds, context } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    const response = await queryKnowledgeBase(question, projectIds || []);
    
    res.json(response);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

export default router;