import React, { useEffect, useRef, useState } from 'react';
import { User, Clock, AlertTriangle, Edit3, CheckCircle } from 'lucide-react';
import { TranscriptEntry, Speaker } from '../types';
import ManualSpeakerIdentification from './ManualSpeakerIdentification';

interface TranscriptPanelProps {
  transcript: TranscriptEntry[];
  onSpeakerCorrected?: (entryId: string, newSpeakerId: string, newSpeakerName: string) => void;
}

export default function TranscriptPanel({ transcript, onSpeakerCorrected }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [availableSpeakers, setAvailableSpeakers] = useState<Speaker[]>([]);
  const [selectedEntryForId, setSelectedEntryForId] = useState<TranscriptEntry | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  useEffect(() => {
    loadAvailableSpeakers();
  }, []);

  const loadAvailableSpeakers = async () => {
    try {
      const response = await fetch('/api/speakers');
      const speakers = await response.json();
      setAvailableSpeakers(speakers);
    } catch (error) {
      console.error('Failed to load speakers:', error);
    }
  };

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

  const handleSpeakerConfirmed = (entry: TranscriptEntry, confirmedSpeakerId: string, speakerName: string) => {
    if (onSpeakerCorrected) {
      onSpeakerCorrected(entry.id, confirmedSpeakerId, speakerName);
    }
    setSelectedEntryForId(null);
    loadAvailableSpeakers(); // Refresh speakers list
  };

  const handleNewSpeakerAdded = (entry: TranscriptEntry, newSpeakerName: string) => {
    if (onSpeakerCorrected) {
      onSpeakerCorrected(entry.id, `new_${Date.now()}`, newSpeakerName);
    }
    setSelectedEntryForId(null);
    loadAvailableSpeakers(); // Refresh speakers list
  };

  const shouldShowLowConfidenceWarning = (entry: TranscriptEntry) => {
    return entry.speakerConfidence !== undefined && entry.speakerConfidence < 0.7;
  };

  const shouldShowNewSpeakerBadge = (entry: TranscriptEntry) => {
    return entry.isNewSpeaker === true;
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
        <div key={entry.id} className="bg-gray-50 rounded-lg p-3 group hover:bg-gray-100 transition-colors">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className={`h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center ${getSpeakerColor(entry.speaker)} relative`}>
                <User className="h-4 w-4" />
                {shouldShowLowConfidenceWarning(entry) && (
                  <AlertTriangle className="absolute -top-1 -right-1 h-3 w-3 text-amber-500 bg-white rounded-full" />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <span className={`font-medium text-sm ${getSpeakerColor(entry.speaker)}`}>
                    {entry.speaker}
                  </span>
                  
                  {shouldShowNewSpeakerBadge(entry) && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      New
                    </span>
                  )}
                  
                  {shouldShowLowConfidenceWarning(entry) && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      Low confidence
                    </span>
                  )}
                  
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
                
                {/* Manual identification trigger */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setSelectedEntryForId(entry)}
                    className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                    title="Correct speaker identification"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{entry.text}</p>
            </div>
          </div>
        </div>
      ))}
      
      {/* Manual Speaker Identification Modal */}
      {selectedEntryForId && (
        <ManualSpeakerIdentification
          transcriptEntry={selectedEntryForId}
          availableSpeakers={availableSpeakers}
          onSpeakerConfirmed={handleSpeakerConfirmed}
          onNewSpeakerAdded={handleNewSpeakerAdded}
          onClose={() => setSelectedEntryForId(null)}
        />
      )}
    </div>
  );
}