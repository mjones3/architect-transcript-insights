import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square, Play, Pause, Volume2 } from 'lucide-react';

interface AudioRecorderProps {
  onAudioData?: (audioData: Blob) => void;
  onTranscriptData?: (transcript: string) => void;
  isConnected?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioData,
  onTranscriptData,
  isConnected = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(null);
  const websocketRef = useRef<WebSocket | null>(null);

  // Initialize audio context and analyzer for visualization
  const initializeAudioAnalysis = (stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      analyzerRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyzerRef.current);
      
      analyzerRef.current.fftSize = 256;
      const bufferLength = analyzerRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateAudioLevel = () => {
        if (analyzerRef.current && isRecording) {
          analyzerRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
          setAudioLevel(average / 255 * 100);
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
    } catch (err) {
      console.error('Error initializing audio analysis:', err);
    }
  };

  // Initialize WebSocket connection for real-time streaming
  const initializeWebSocket = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/transcribe`;
      
      websocketRef.current = new WebSocket(wsUrl);
      
      websocketRef.current.onopen = () => {
        console.log('WebSocket connected for audio streaming');
      };
      
      websocketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.transcript && onTranscriptData) {
          onTranscriptData(data.transcript);
        }
      };
      
      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Real-time transcription connection failed');
      };
      
      websocketRef.current.onclose = () => {
        console.log('WebSocket disconnected');
      };
    } catch (err) {
      console.error('Error initializing WebSocket:', err);
    }
  };

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });
      
      setHasPermission(true);
      setError(null);
      return stream;
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setHasPermission(false);
      
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please enable in browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else {
        setError('Unable to access microphone. Please check permissions.');
      }
      
      throw err;
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await requestMicrophonePermission();
      streamRef.current = stream;
      
      // Initialize audio analysis for visualization
      initializeAudioAnalysis(stream);
      
      // Initialize WebSocket for real-time streaming
      initializeWebSocket();
      
      // Create MediaRecorder for audio data
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          
          // Send real-time audio data via WebSocket
          if (websocketRef.current?.readyState === WebSocket.OPEN) {
            websocketRef.current.send(event.data);
          }
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        if (onAudioData) {
          onAudioData(audioBlob);
        }
      };
      
      // Start recording with 100ms chunks for real-time streaming
      mediaRecorder.start(100);
      setIsRecording(true);
      setIsPaused(false);
      
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsRecording(false);
    setIsPaused(false);
    setAudioLevel(0);
  };

  // Pause/Resume recording
  const togglePause = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  // Audio level visualization
  const AudioVisualization = () => (
    <div className="flex items-center space-x-1 h-8">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className={`w-1 bg-gradient-to-t from-blue-500 to-green-400 rounded-full transition-all duration-75 ${
            audioLevel > (i * 5) ? 'opacity-100' : 'opacity-20'
          }`}
          style={{
            height: `${Math.max(8, (audioLevel / 100) * 32)}px`
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Audio Recording</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Audio Visualization */}
        {isRecording && (
          <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
            <AudioVisualization />
          </div>
        )}

        {/* Recording Controls */}
        <div className="flex items-center justify-center space-x-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={hasPermission === false}
              className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Mic className="w-5 h-5" />
              <span>Start Recording</span>
            </button>
          ) : (
            <>
              <button
                onClick={togglePause}
                className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
              
              <button
                onClick={stopRecording}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Square className="w-4 h-4" />
                <span>Stop</span>
              </button>
            </>
          )}
        </div>

        {/* Status Information */}
        <div className="text-center space-y-2">
          {hasPermission === null && (
            <p className="text-sm text-gray-500">Click "Start Recording" to request microphone access</p>
          )}
          {hasPermission === true && !isRecording && (
            <p className="text-sm text-green-600">✓ Microphone access granted</p>
          )}
          {isRecording && (
            <div className="space-y-1">
              <p className="text-sm text-red-600 font-medium">
                ● Recording {isPaused ? '(Paused)' : 'in progress...'}
              </p>
              <p className="text-xs text-gray-500">
                Audio Level: {Math.round(audioLevel)}%
              </p>
            </div>
          )}
        </div>

        {/* Real-time Features */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Volume2 className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-800">Real-time Audio</p>
            <p className="text-xs text-blue-600">Live audio processing</p>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Mic className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-800">Live Transcription</p>
            <p className="text-xs text-green-600">Speech-to-text streaming</p>
          </div>
        </div>
      </div>
    </div>
  );
};