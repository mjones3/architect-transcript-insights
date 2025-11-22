import { Router, Request, Response } from 'express';
import { speakerRecognition } from '../services/speakerRecognition';

const router = Router();

// Get all speakers
router.get('/', async (req: Request, res: Response) => {
  try {
    const speakers = await speakerRecognition.getAllSpeakers();
    res.json(speakers);
  } catch (error) {
    console.error('Get speakers error:', error);
    res.status(500).json({ error: 'Failed to get speakers' });
  }
});

// Get speaker statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await speakerRecognition.getSpeakerStats();
    res.json(stats);
  } catch (error) {
    console.error('Get speaker stats error:', error);
    res.status(500).json({ error: 'Failed to get speaker statistics' });
  }
});

// Update speaker name
router.put('/:speakerId/name', async (req: Request, res: Response) => {
  try {
    const { speakerId } = req.params;
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required and must be a non-empty string' });
    }
    
    const success = await speakerRecognition.updateSpeakerName(speakerId, name.trim());
    
    if (!success) {
      return res.status(404).json({ error: 'Speaker not found' });
    }
    
    res.json({ success: true, message: 'Speaker name updated successfully' });
  } catch (error) {
    console.error('Update speaker name error:', error);
    res.status(500).json({ error: 'Failed to update speaker name' });
  }
});

// Merge speakers (identify two speakers as the same person)
router.post('/merge', async (req: Request, res: Response) => {
  try {
    const { primarySpeakerId, secondarySpeakerId } = req.body;
    
    if (!primarySpeakerId || !secondarySpeakerId) {
      return res.status(400).json({ error: 'Both primarySpeakerId and secondarySpeakerId are required' });
    }
    
    if (primarySpeakerId === secondarySpeakerId) {
      return res.status(400).json({ error: 'Cannot merge a speaker with itself' });
    }
    
    const success = await speakerRecognition.mergeSpeakers(primarySpeakerId, secondarySpeakerId);
    
    if (!success) {
      return res.status(404).json({ error: 'One or both speakers not found' });
    }
    
    res.json({ success: true, message: 'Speakers merged successfully' });
  } catch (error) {
    console.error('Merge speakers error:', error);
    res.status(500).json({ error: 'Failed to merge speakers' });
  }
});

// Delete speaker
router.delete('/:speakerId', async (req: Request, res: Response) => {
  try {
    const { speakerId } = req.params;
    
    const success = await speakerRecognition.deleteSpeaker(speakerId);
    
    if (!success) {
      return res.status(404).json({ error: 'Speaker not found' });
    }
    
    res.json({ success: true, message: 'Speaker deleted successfully' });
  } catch (error) {
    console.error('Delete speaker error:', error);
    res.status(500).json({ error: 'Failed to delete speaker' });
  }
});

// Train speaker recognition with manual feedback
router.post('/train', async (req: Request, res: Response) => {
  try {
    const { speakerId, audioData, transcriptText, timestamp, sessionId } = req.body;
    
    if (!speakerId || !audioData) {
      return res.status(400).json({ error: 'Speaker ID and audio data are required' });
    }
    
    // Use the feedback to improve speaker recognition
    const speakers = await speakerRecognition.getAllSpeakers();
    const speaker = speakers.find(s => s.id === speakerId);
    
    if (!speaker) {
      return res.status(404).json({ error: 'Speaker not found' });
    }
    
    // In a real implementation, this would:
    // 1. Extract audio features from the provided audio data
    // 2. Update the speaker's voice profile with the new sample
    // 3. Retrain the model with the corrected identification
    
    console.log(`Training speaker recognition for ${speaker.displayName} with new sample`);
    
    // For now, just log the training data
    console.log({
      speakerId,
      speakerName: speaker.displayName,
      transcriptText,
      timestamp,
      sessionId
    });
    
    res.json({ 
      success: true, 
      message: `Training data added for ${speaker.displayName}`,
      speakerId,
      speakerName: speaker.displayName
    });
  } catch (error) {
    console.error('Speaker training error:', error);
    res.status(500).json({ error: 'Failed to train speaker recognition' });
  }
});

// Create new speaker with initial training data
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { displayName, audioData, transcriptText, timestamp, sessionId } = req.body;
    
    if (!displayName || !audioData) {
      return res.status(400).json({ error: 'Display name and audio data are required' });
    }
    
    // Create new speaker profile
    const speakerId = `speaker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // In a real implementation, this would:
    // 1. Extract voice characteristics from the audio sample
    // 2. Create a new speaker profile in the recognition system
    // 3. Enroll the speaker with AWS Voice ID if using that service
    
    console.log(`Creating new speaker: ${displayName} with ID: ${speakerId}`);
    
    // For now, simulate the creation
    const newSpeaker = {
      id: speakerId,
      name: speakerId,
      displayName: displayName.trim(),
      confidence: 1.0,
      sampleCount: 1,
      lastSeen: new Date(),
      createdAt: new Date(),
      meetings: [sessionId || 'manual'],
      verified: true // Manually created speakers are considered verified
    };
    
    res.json({ 
      success: true, 
      message: `Created new speaker: ${displayName}`,
      speaker: newSpeaker
    });
  } catch (error) {
    console.error('Create speaker error:', error);
    res.status(500).json({ error: 'Failed to create speaker' });
  }
});

// Manual speaker identification
router.post('/identify', async (req: Request, res: Response) => {
  try {
    const { audioData, sessionId, knownSpeakerId } = req.body;
    
    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required' });
    }
    
    // If a known speaker ID is provided, just return that
    if (knownSpeakerId) {
      const speakers = await speakerRecognition.getAllSpeakers();
      const speaker = speakers.find(s => s.id === knownSpeakerId);
      
      if (speaker) {
        return res.json({
          speakerId: speaker.id,
          speakerName: speaker.displayName,
          confidence: 1.0,
          isNewSpeaker: false
        });
      }
    }
    
    // Otherwise, use automatic identification
    const speakerMatch = await speakerRecognition.identifySpeaker(
      audioData, 
      sessionId || 'manual'
    );
    
    res.json(speakerMatch);
  } catch (error) {
    console.error('Manual speaker identification error:', error);
    res.status(500).json({ error: 'Failed to identify speaker' });
  }
});

export default router;