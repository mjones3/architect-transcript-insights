import React, { useState, useEffect } from 'react';
import { User, UserPlus, Check, X, AlertTriangle, Target, Brain } from 'lucide-react';
import { Speaker, TranscriptEntry } from '../types';
import axios from 'axios';

interface ManualSpeakerIdentificationProps {
  transcriptEntry: TranscriptEntry;
  availableSpeakers: Speaker[];
  onSpeakerConfirmed: (entry: TranscriptEntry, confirmedSpeakerId: string, speakerName: string) => void;
  onNewSpeakerAdded: (entry: TranscriptEntry, newSpeakerName: string) => void;
  onClose: () => void;
}

export default function ManualSpeakerIdentification({
  transcriptEntry,
  availableSpeakers,
  onSpeakerConfirmed,
  onNewSpeakerAdded,
  onClose
}: ManualSpeakerIdentificationProps) {
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>('');
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirmExistingSpeaker = async () => {
    if (!selectedSpeakerId) return;

    setLoading(true);
    try {
      const speaker = availableSpeakers.find(s => s.id === selectedSpeakerId);
      if (!speaker) return;

      // Send training data to improve recognition
      await axios.post('/api/speakers/train', {
        speakerId: selectedSpeakerId,
        audioData: transcriptEntry.text, // In real implementation, this would be audio data
        transcriptText: transcriptEntry.text,
        timestamp: transcriptEntry.timestamp,
        sessionId: 'manual_training'
      });

      onSpeakerConfirmed(transcriptEntry, selectedSpeakerId, speaker.displayName);
      onClose();
    } catch (error) {
      console.error('Failed to train speaker recognition:', error);
      alert('Failed to update speaker training. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewSpeaker = async () => {
    if (!newSpeakerName.trim()) return;

    setLoading(true);
    try {
      // Create new speaker profile
      const response = await axios.post('/api/speakers/create', {
        displayName: newSpeakerName.trim(),
        audioData: transcriptEntry.text, // In real implementation, this would be audio data
        transcriptText: transcriptEntry.text,
        timestamp: transcriptEntry.timestamp,
        sessionId: 'manual_training'
      });

      onNewSpeakerAdded(transcriptEntry, newSpeakerName.trim());
      onClose();
    } catch (error) {
      console.error('Failed to create new speaker:', error);
      alert('Failed to create new speaker. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center space-x-3">
            <Target className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Identify Speaker</h3>
          </div>
          {transcriptEntry.speakerConfidence !== undefined && (
            <div className="mt-2 flex items-center space-x-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-gray-600">
                AI confidence: {Math.round(transcriptEntry.speakerConfidence * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Transcript snippet */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-500 mb-1">
              {new Date(transcriptEntry.timestamp).toLocaleTimeString()}
            </div>
            <div className="text-gray-900">
              <span className="font-medium text-indigo-600">
                {transcriptEntry.speaker}:
              </span>{' '}
              {transcriptEntry.text}
            </div>
          </div>

          {/* Speaker options */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Who is this speaker?</h4>

            {/* Existing speakers */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableSpeakers.map((speaker) => (
                <label
                  key={speaker.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSpeakerId === speaker.id
                      ? 'bg-indigo-50 border-indigo-300'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="speaker"
                    value={speaker.id}
                    checked={selectedSpeakerId === speaker.id}
                    onChange={(e) => {
                      setSelectedSpeakerId(e.target.value);
                      setIsCreatingNew(false);
                    }}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {speaker.displayName}
                      </span>
                      {speaker.verified && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {speaker.sampleCount} samples • {speaker.meetings.length} meetings
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* Create new speaker */}
            <div className="border-t pt-3">
              <label
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isCreatingNew
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="speaker"
                  checked={isCreatingNew}
                  onChange={() => {
                    setIsCreatingNew(true);
                    setSelectedSpeakerId('');
                  }}
                  className="text-green-600 focus:ring-green-500"
                />
                <UserPlus className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-900">Create New Speaker</span>
              </label>

              {isCreatingNew && (
                <div className="mt-3 ml-8">
                  <input
                    type="text"
                    placeholder="Enter speaker name (e.g., John Smith)"
                    value={newSpeakerName}
                    onChange={(e) => setNewSpeakerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          {/* Training info */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Brain className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Training the AI:</strong> Your identification will help improve automatic speaker recognition for future meetings.
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            disabled={loading}
          >
            Skip
          </button>
          
          <div className="flex items-center space-x-2">
            {isCreatingNew ? (
              <button
                onClick={handleCreateNewSpeaker}
                disabled={!newSpeakerName.trim() || loading}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                <span>Create & Train</span>
              </button>
            ) : (
              <button
                onClick={handleConfirmExistingSpeaker}
                disabled={!selectedSpeakerId || loading}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>Confirm & Train</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}