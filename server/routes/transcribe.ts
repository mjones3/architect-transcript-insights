import { Router, Request, Response } from 'express';
import { stopTranscription } from '../services/awsTranscribe';

const router = Router();

// Stop transcription session
router.post('/stop', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }
    
    stopTranscription(sessionId);
    
    res.json({ success: true, message: 'Transcription stopped' });
  } catch (error) {
    console.error('Stop transcription error:', error);
    res.status(500).json({ error: 'Failed to stop transcription' });
  }
});

// Get speaker profiles
router.get('/speakers', async (req: Request, res: Response) => {
  try {
    // In production, this would retrieve saved speaker profiles
    const speakers = [
      { id: '1', name: 'Speaker 1', voiceProfile: 'profile-1' },
      { id: '2', name: 'Speaker 2', voiceProfile: 'profile-2' },
    ];
    
    res.json(speakers);
  } catch (error) {
    console.error('Get speakers error:', error);
    res.status(500).json({ error: 'Failed to get speakers' });
  }
});

export default router;