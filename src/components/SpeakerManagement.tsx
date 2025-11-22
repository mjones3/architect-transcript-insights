import React, { useState, useEffect } from 'react';
import { 
  User, 
  UserCheck, 
  UserX, 
  Edit3, 
  Merge, 
  Trash2, 
  Calendar, 
  BarChart3,
  AlertCircle,
  CheckCircle,
  X,
  Check
} from 'lucide-react';
import { Speaker } from '../types';
import axios from 'axios';

interface SpeakerManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SpeakerManagement({ isOpen, onClose }: SpeakerManagementProps) {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadSpeakers();
      loadStats();
    }
  }, [isOpen]);

  const loadSpeakers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/speakers');
      setSpeakers(response.data);
    } catch (error) {
      console.error('Failed to load speakers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/speakers/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load speaker stats:', error);
    }
  };

  const handleUpdateSpeakerName = async (speakerId: string, name: string) => {
    try {
      await axios.put(`/api/speakers/${speakerId}/name`, { name });
      await loadSpeakers();
      setEditingSpeaker(null);
      setNewName('');
    } catch (error) {
      console.error('Failed to update speaker name:', error);
      alert('Failed to update speaker name');
    }
  };

  const handleMergeSpeakers = async () => {
    if (selectedSpeakers.length !== 2) {
      alert('Please select exactly 2 speakers to merge');
      return;
    }

    const [primary, secondary] = selectedSpeakers;
    const primarySpeaker = speakers.find(s => s.id === primary);
    const secondarySpeaker = speakers.find(s => s.id === secondary);

    if (!confirm(`Merge "${secondarySpeaker?.displayName}" into "${primarySpeaker?.displayName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await axios.post('/api/speakers/merge', {
        primarySpeakerId: primary,
        secondarySpeakerId: secondary
      });
      await loadSpeakers();
      setSelectedSpeakers([]);
      alert('Speakers merged successfully');
    } catch (error) {
      console.error('Failed to merge speakers:', error);
      alert('Failed to merge speakers');
    }
  };

  const handleDeleteSpeaker = async (speakerId: string) => {
    const speaker = speakers.find(s => s.id === speakerId);
    if (!confirm(`Delete speaker "${speaker?.displayName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`/api/speakers/${speakerId}`);
      await loadSpeakers();
      setSelectedSpeakers(prev => prev.filter(id => id !== speakerId));
    } catch (error) {
      console.error('Failed to delete speaker:', error);
      alert('Failed to delete speaker');
    }
  };

  const toggleSpeakerSelection = (speakerId: string) => {
    setSelectedSpeakers(prev => 
      prev.includes(speakerId)
        ? prev.filter(id => id !== speakerId)
        : [...prev, speakerId]
    );
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <User className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Speaker Management</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="px-6 py-4 bg-indigo-50 border-b">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{stats.totalSpeakers}</div>
                <div className="text-sm text-gray-600">Total Speakers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.verifiedSpeakers}</div>
                <div className="text-sm text-gray-600">Verified</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{Math.round(stats.averageSampleCount)}</div>
                <div className="text-sm text-gray-600">Avg Samples</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.recentSpeakers}</div>
                <div className="text-sm text-gray-600">Recent (7d)</div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-3 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {selectedSpeakers.length} selected
            </span>
            {selectedSpeakers.length === 2 && (
              <button
                onClick={handleMergeSpeakers}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                <Merge className="h-4 w-4" />
                <span>Merge Speakers</span>
              </button>
            )}
          </div>
          <button
            onClick={loadSpeakers}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            Refresh
          </button>
        </div>

        {/* Speakers List */}
        <div className="overflow-y-auto max-h-96">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading speakers...</div>
          ) : speakers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No speakers found</p>
              <p className="text-sm mt-1">Speakers will appear as meetings are recorded</p>
            </div>
          ) : (
            <div className="divide-y">
              {speakers.map((speaker) => (
                <div key={speaker.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedSpeakers.includes(speaker.id)}
                        onChange={() => toggleSpeakerSelection(speaker.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        speaker.verified ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {speaker.verified ? (
                          <UserCheck className="h-5 w-5 text-green-600" />
                        ) : (
                          <UserX className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        {editingSpeaker === speaker.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="Enter speaker name"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateSpeakerName(speaker.id, newName)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingSpeaker(null);
                                setNewName('');
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">
                                {speaker.displayName}
                              </span>
                              {speaker.verified && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                              <span>{speaker.sampleCount} samples</span>
                              <span>{speaker.meetings.length} meetings</span>
                              <span>Last seen: {formatDate(speaker.lastSeen)}</span>
                              <span>Confidence: {Math.round(speaker.confidence * 100)}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setEditingSpeaker(speaker.id);
                          setNewName(speaker.displayName);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Edit name"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSpeaker(speaker.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete speaker"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Speakers are automatically identified and learned across meetings
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}