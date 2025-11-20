import { TranscriptEntry } from '../types';

let websocket: WebSocket | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioContext: AudioContext | null = null;

export async function startTranscription(
  stream: MediaStream,
  onTranscriptUpdate: (entry: TranscriptEntry) => void
): Promise<{ websocket: WebSocket; mediaRecorder: MediaRecorder }> {
  
  // Initialize WebSocket connection to backend
  websocket = new WebSocket('ws://localhost:3001/transcribe');
  
  websocket.onopen = () => {
    console.log('WebSocket connected for transcription');
  };

  websocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'transcript') {
        const entry: TranscriptEntry = {
          id: generateId(),
          timestamp: new Date(data.timestamp || Date.now()),
          speaker: data.speaker || 'Unknown Speaker',
          text: data.text,
          confidence: data.confidence
        };
        onTranscriptUpdate(entry);
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
    }
  };

  websocket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  // Setup audio context and media recorder
  audioContext = new AudioContext({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource(stream);
  
  // Create media recorder to capture audio chunks
  mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm',
    audioBitsPerSecond: 128000
  });

  mediaRecorder.ondataavailable = async (event) => {
    if (event.data.size > 0 && websocket?.readyState === WebSocket.OPEN) {
      // Convert blob to base64 and send to backend
      const reader = new FileReader();
      reader.onloadend = () => {
        if (websocket?.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({
            type: 'audio',
            data: reader.result
          }));
        }
      };
      reader.readAsDataURL(event.data);
    }
  };

  // Start recording with 100ms chunks for real-time processing
  mediaRecorder.start(100);

  return { websocket, mediaRecorder };
}

export async function stopTranscription(connection: { websocket: WebSocket; mediaRecorder: MediaRecorder }) {
  if (connection.mediaRecorder && connection.mediaRecorder.state !== 'inactive') {
    connection.mediaRecorder.stop();
  }
  
  if (connection.websocket && connection.websocket.readyState === WebSocket.OPEN) {
    connection.websocket.close();
  }

  if (audioContext) {
    await audioContext.close();
    audioContext = null;
  }
}

// Speaker identification based on voice characteristics
const speakerProfiles = new Map<string, string>();
let speakerCounter = 1;

export function identifySpeaker(voiceCharacteristics?: any): string {
  // In production, this would use voice biometrics
  // For demo, we'll use simple speaker assignment
  if (!voiceCharacteristics) {
    return `Speaker ${speakerCounter++}`;
  }
  
  const voiceId = JSON.stringify(voiceCharacteristics);
  if (!speakerProfiles.has(voiceId)) {
    speakerProfiles.set(voiceId, `Speaker ${speakerCounter++}`);
  }
  
  return speakerProfiles.get(voiceId)!;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}