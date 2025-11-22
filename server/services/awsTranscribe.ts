import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  AudioStream,
  AudioEvent,
  TranscriptEvent,
} from '@aws-sdk/client-transcribe-streaming';
import { WebSocket } from 'ws';
import { speakerRecognition } from './speakerRecognition';

const transcribeClient = new TranscribeStreamingClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const activeStreams = new Map<string, any>();
const sessionSpeakers = new Map<string, Map<string, string>>(); // sessionId -> speakerLabel -> speakerId

export async function processAudioStream(audioData: string, ws: WebSocket) {
  try {
    const sessionId = generateSessionId();
    
    // Convert base64 audio to buffer
    const base64Data = audioData.split(',')[1];
    const audioBuffer = Buffer.from(base64Data, 'base64');

    // Create audio stream generator
    async function* audioStreamGenerator() {
      yield {
        AudioEvent: {
          AudioChunk: audioBuffer,
        },
      } as AudioEvent;
    }

    // Start transcription stream
    const command = new StartStreamTranscriptionCommand({
      LanguageCode: 'en-US',
      MediaSampleRateHertz: 16000,
      MediaEncoding: 'pcm',
      AudioStream: audioStreamGenerator(),
      EnableSpeakerIdentification: true,
      ShowSpeakerLabel: true,
      MaxSpeakerLabels: 10,
    });

    const response = await transcribeClient.send(command);

    // Process transcription results
    if (response.TranscriptResultStream) {
      for await (const event of response.TranscriptResultStream) {
        if (event.TranscriptEvent) {
          const results = event.TranscriptEvent.Transcript?.Results;
          
          if (results && results.length > 0) {
            for (const result of results) {
              if (!result.IsPartial && result.Alternatives && result.Alternatives.length > 0) {
                const alternative = result.Alternatives[0];
                const speakerData = await identifySpeakerAdvanced(alternative.Items, audioBuffer, sessionId);
                
                ws.send(JSON.stringify({
                  type: 'transcript',
                  text: alternative.Transcript || '',
                  speaker: speakerData.speakerName,
                  speakerId: speakerData.speakerId,
                  confidence: alternative.Items?.[0]?.Confidence || 1,
                  speakerConfidence: speakerData.confidence,
                  isNewSpeaker: speakerData.isNewSpeaker,
                  timestamp: new Date().toISOString(),
                }));
              }
            }
          }
        }
      }
    }

    activeStreams.set(sessionId, response);
  } catch (error) {
    console.error('AWS Transcribe error:', error);
    
    // Fallback to mock transcription for development
    mockTranscription(ws);
  }
}

async function identifySpeakerAdvanced(items?: any[], audioData?: Buffer, sessionId?: string): Promise<{
  speakerId: string;
  speakerName: string;
  confidence: number;
  isNewSpeaker: boolean;
}> {
  if (!sessionId) sessionId = 'default';
  if (!sessionSpeakers.has(sessionId)) {
    sessionSpeakers.set(sessionId, new Map());
  }
  
  const sessionMap = sessionSpeakers.get(sessionId)!;
  const speakerLabel = items?.[0]?.Speaker || 'unknown';

  // Check if we've already mapped this AWS Transcribe speaker label in this session
  if (sessionMap.has(speakerLabel)) {
    const speakerId = sessionMap.get(speakerLabel)!;
    const allSpeakers = await speakerRecognition.getAllSpeakers();
    const speaker = allSpeakers.find(s => s.id === speakerId);
    
    return {
      speakerId,
      speakerName: speaker?.displayName || speakerId,
      confidence: 0.9, // High confidence for already mapped speakers
      isNewSpeaker: false
    };
  }

  try {
    // Use our advanced speaker recognition
    const speakerMatch = await speakerRecognition.identifySpeaker(
      { audioData, items, speakerLabel },
      sessionId
    );

    // Map the AWS speaker label to our speaker ID for this session
    sessionMap.set(speakerLabel, speakerMatch.speakerId);

    return speakerMatch;
  } catch (error) {
    console.error('Speaker recognition error:', error);
    
    // Fallback to basic speaker identification
    const fallbackName = `Speaker ${speakerLabel}`;
    return {
      speakerId: `fallback_${speakerLabel}`,
      speakerName: fallbackName,
      confidence: 0.5,
      isNewSpeaker: true
    };
  }
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Mock transcription for development/testing
function mockTranscription(ws: WebSocket) {
  const mockTranscripts = [
    { text: "We need to consider the scalability requirements for this architecture.", speaker: "Speaker 1" },
    { text: "I agree. We should implement auto-scaling with a target of handling 10,000 concurrent users.", speaker: "Speaker 2" },
    { text: "What about the database layer? Should we use RDS or DynamoDB?", speaker: "Speaker 3" },
    { text: "Given our need for flexible schema, I'd recommend DynamoDB with global secondary indexes.", speaker: "Speaker 1" },
    { text: "That makes sense. We also need to address security compliance.", speaker: "Speaker 2" },
  ];

  let index = 0;
  const interval = setInterval(() => {
    if (index < mockTranscripts.length && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'transcript',
        ...mockTranscripts[index],
        confidence: 0.95,
        timestamp: new Date().toISOString(),
      }));
      index++;
    } else {
      clearInterval(interval);
    }
  }, 3000);
}

export function stopTranscription(sessionId: string) {
  const stream = activeStreams.get(sessionId);
  if (stream) {
    // Close the stream
    activeStreams.delete(sessionId);
  }
}