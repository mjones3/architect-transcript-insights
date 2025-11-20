import React, { useEffect, useRef } from 'react';
import { User, Clock } from 'lucide-react';
import { TranscriptEntry } from '../types';

interface TranscriptPanelProps {
  transcript: TranscriptEntry[];
}

export default function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getSpeakerColor = (speaker: string) => {
    const colors = [
      'text-blue-600',
      'text-green-600',
      'text-purple-600',
      'text-orange-600',
      'text-pink-600',
    ];
    const index = speaker.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (transcript.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center text-gray-400">
          <User className="h-12 w-12 mx-auto mb-3" />
          <p className="text-sm">No transcript yet</p>
          <p className="text-xs mt-1">Start recording to see live transcription</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-[calc(100%-73px)] overflow-y-auto p-4 space-y-3">
      {transcript.map((entry) => (
        <div key={entry.id} className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className={`h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center ${getSpeakerColor(entry.speaker)}`}>
                <User className="h-4 w-4" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className={`font-medium text-sm ${getSpeakerColor(entry.speaker)}`}>
                  {entry.speaker}
                </span>
                <span className="text-xs text-gray-400 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTime(entry.timestamp)}
                </span>
                {entry.confidence && (
                  <span className="text-xs text-gray-400">
                    ({Math.round(entry.confidence * 100)}%)
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{entry.text}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}