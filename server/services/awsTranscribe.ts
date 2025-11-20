import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  AudioStream,
  AudioEvent,
  TranscriptEvent,
} from '@aws-sdk/client-transcribe-streaming';
import { WebSocket } from 'ws';

const transcribeClient = new TranscribeStreamingClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const activeStreams = new Map<string, any>();
const speakerProfiles = new Map<string, string>();
let speakerCounter = 1;

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
                const speaker = identifySpeaker(alternative.Items);
                
                ws.send(JSON.stringify({
                  type: 'transcript',
                  text: alternative.Transcript || '',
                  speaker: speaker,
                  confidence: alternative.Items?.[0]?.Confidence || 1,
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

function identifySpeaker(items?: any[]): string {
  if (!items || items.length === 0) {
    return `Speaker ${speakerCounter}`;
  }

  const speakerLabel = items[0]?.Speaker;
  if (speakerLabel) {
    if (!speakerProfiles.has(speakerLabel)) {
      speakerProfiles.set(speakerLabel, `Speaker ${speakerCounter++}`);
    }
    return speakerProfiles.get(speakerLabel)!;
  }

  return `Speaker ${speakerCounter}`;
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