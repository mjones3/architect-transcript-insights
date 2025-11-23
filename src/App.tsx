import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Save, X, Check, FileText, Brain, MessageSquare, Info, Users, Volume2 } from 'lucide-react';
import AuthGuard from './components/AuthGuard';
import ProjectCheckboxes from './components/ProjectCheckboxes';
import ProjectStatusBar from './components/ProjectStatusBar';
import TranscriptPanel from './components/TranscriptPanel';
import SummaryPanel from './components/SummaryPanel';
import QueryPanel from './components/QueryPanel';
import SpeakerManagement from './components/SpeakerManagement';
import UserProfile from './components/UserProfile';
import { AudioRecorder } from './components/AudioRecorder';
import { TranscriptEntry, Project, MeetingSummary } from './types';
import { startTranscription, stopTranscription } from './services/transcription';
import { generateSummary, getClaudeProjects } from './services/ai';
import { saveTranscript } from './services/storage';
import { authService, AuthSession } from './services/auth';

function MainApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSpeakerManagement, setShowSpeakerManagement] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [audioBlobs, setAudioBlobs] = useState<Blob[]>([]);
  const transcriptionRef = useRef<any>(null);
  const websocketRef = useRef<WebSocket | null>(null);

  // Get current auth session on mount
  useEffect(() => {
    const getAuthSession = async () => {
      const session = await authService.getCurrentSession();
      setAuthSession(session);
    };
    getAuthSession();
  }, []);

  // Load Claude Projects on component mount
  useEffect(() => {
    loadClaudeProjects();
  }, []);

  const loadClaudeProjects = async () => {
    try {
      const claudeProjects = await getClaudeProjects();
      
      if (claudeProjects.length === 0) {
        console.warn('No Claude Projects configured. Please add your project IDs to .env file.');
        alert('⚠️ No Claude Projects configured!\n\nPlease add your actual Claude Project IDs to the CLAUDE_PROJECT_IDS variable in your .env file.\n\nExample:\nCLAUDE_PROJECT_IDS=proj_abc123,proj_def456,proj_ghi789');
      }
      
      setProjects(claudeProjects);
    } catch (error) {
      console.error('Failed to load Claude projects:', error);
      setProjects([]);
    }
  };

  // Handle audio data from AudioRecorder
  const handleAudioData = (audioBlob: Blob) => {
    setAudioBlobs(prev => [...prev, audioBlob]);
  };

  // Handle real-time transcript data
  const handleTranscriptData = (transcriptText: string) => {
    const newEntry: TranscriptEntry = {
      id: `transcript-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      text: transcriptText,
      speaker: 'Unknown Speaker',
      speakerId: 'unknown',
      confidence: 0.8,
      isPartial: false
    };
    setTranscript(prev => [...prev, newEntry]);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setTranscript([]);
    setSummary(null);
    setAudioBlobs([]);
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    
    // Generate summary when recording stops
    if (transcript.length > 0) {
      const summaryData = await generateSummary(transcript);
      setSummary(summaryData);
    }
  };

  const handleSaveAndClose = async () => {
    if (selectedProjects.length === 0) {
      alert('Please select at least one Claude Project to save to.');
      return;
    }

    setIsSaving(true);
    try {
      await saveTranscript(transcript, summary, selectedProjects);
      alert(`Transcript successfully uploaded to ${selectedProjects.length} Claude Project${selectedProjects.length > 1 ? 's' : ''} and saved to S3!`);
      // Reset state
      setTranscript([]);
      setSummary(null);
      setSelectedProjects([]);
    } catch (error) {
      console.error('Failed to save transcript:', error);
      alert('Failed to save transcript. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-generate summary periodically during recording
  useEffect(() => {
    if (!isRecording || transcript.length === 0) return;

    const interval = setInterval(async () => {
      const summaryData = await generateSummary(transcript);
      setSummary(summaryData);
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isRecording, transcript]);

  const handleSpeakerCorrected = (entryId: string, newSpeakerId: string, newSpeakerName: string) => {
    setTranscript(prev => prev.map(entry => 
      entry.id === entryId 
        ? { ...entry, speakerId: newSpeakerId, speaker: newSpeakerName }
        : entry
    ));
  };

  const handleSignOut = () => {
    setAuthSession(null);
    // Reset app state on sign out
    setIsRecording(false);
    setSelectedProjects([]);
    setTranscript([]);
    setSummary(null);
    setProjects([]);
    setIsSaving(false);
    setShowSpeakerManagement(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-3">
          {/* Top Row - Title and Actions */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">Architect Transcript Insights</h1>
              {selectedProjects.length === 0 && (
                <div className="flex items-center space-x-2 bg-amber-50 text-amber-700 text-sm px-3 py-1 rounded-lg">
                  <Info className="h-4 w-4" />
                  <span>Select Claude Projects below to enable queries and knowledge sync</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {/* User Profile */}
              {authSession && (
                <UserProfile 
                  session={authSession} 
                  onSignOut={handleSignOut}
                />
              )}
              
              <button
                onClick={() => setShowSpeakerManagement(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                title="Manage speakers"
              >
                <Users className="h-4 w-4" />
                <span>Speakers</span>
              </button>
              <button
                onClick={handleSaveAndClose}
                disabled={transcript.length === 0 || isSaving || selectedProjects.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                title={selectedProjects.length === 0 ? "Please select at least one Claude Project" : ""}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Save & Close</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Bottom Row - Claude Projects Checkboxes */}
          <div className="border-t pt-3">
            <ProjectCheckboxes
              projects={projects}
              selectedProjects={selectedProjects}
              onSelectionChange={setSelectedProjects}
              isCompact={true}
            />
          </div>
        </div>
        
        {/* Project Status Bar */}
        <ProjectStatusBar 
          selectedCount={selectedProjects.length}
          isRecording={isRecording}
          hasTranscript={transcript.length > 0}
        />
      </header>

      {/* Main Content */}
      <main className="flex h-[calc(100vh-120px)]">
        {/* Left Panel - Audio Recording */}
        <div className="w-1/3 border-r bg-white flex flex-col">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center space-x-2">
              <Volume2 className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-800">Audio Recording</h2>
              {isRecording && (
                <span className="flex items-center space-x-1 text-sm text-red-500">
                  <span className="animate-pulse">●</span>
                  <span>Live</span>
                </span>
              )}
            </div>
          </div>
          
          {/* Audio Recorder Component */}
          <div className="p-4 flex-shrink-0">
            <AudioRecorder 
              onAudioData={handleAudioData}
              onTranscriptData={handleTranscriptData}
              isConnected={isWebSocketConnected}
            />
          </div>
          
          {/* Transcript Display */}
          <div className="flex-1 overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-gray-600" />
                <h3 className="text-md font-medium text-gray-800">Live Transcript</h3>
              </div>
            </div>
            <TranscriptPanel 
              transcript={transcript} 
              onSpeakerCorrected={handleSpeakerCorrected}
            />
          </div>
        </div>

        {/* Middle Panel - Summary */}
        <div className="w-1/3 border-r bg-white">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-800">Meeting Summary</h2>
            </div>
          </div>
          <SummaryPanel summary={summary} />
        </div>

        {/* Right Panel - Query */}
        <div className="w-1/3 bg-white">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-800">Architecture Query</h2>
            </div>
          </div>
          <QueryPanel selectedProjects={selectedProjects} />
        </div>
      </main>

      {/* Speaker Management Modal */}
      <SpeakerManagement 
        isOpen={showSpeakerManagement}
        onClose={() => setShowSpeakerManagement(false)}
      />
    </div>
  );
}

// Main App wrapped with Authentication
function App() {
  return (
    <AuthGuard>
      <MainApp />
    </AuthGuard>
  );
}

export default App;