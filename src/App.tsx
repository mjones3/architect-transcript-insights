import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Save, X, Check, FileText, Brain, MessageSquare } from 'lucide-react';
import ProjectSelector from './components/ProjectSelector';
import TranscriptPanel from './components/TranscriptPanel';
import SummaryPanel from './components/SummaryPanel';
import QueryPanel from './components/QueryPanel';
import { TranscriptEntry, Project, MeetingSummary } from './types';
import { startTranscription, stopTranscription } from './services/transcription';
import { generateSummary, getClaudeProjects } from './services/ai';
import { saveTranscript } from './services/storage';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const transcriptionRef = useRef<any>(null);

  // Load Claude Projects on component mount
  useEffect(() => {
    loadClaudeProjects();
  }, []);

  const loadClaudeProjects = async () => {
    try {
      const claudeProjects = await getClaudeProjects();
      setProjects(claudeProjects);
    } catch (error) {
      console.error('Failed to load Claude projects:', error);
      // Use fallback projects if Claude Projects API fails
      setProjects([
        { id: 'aws-architecture', name: 'AWS Architecture Best Practices', description: 'Cloud architecture patterns and solutions' },
        { id: 'microservices', name: 'Microservices Design', description: 'Microservices patterns and implementation' },
        { id: 'security', name: 'Security & Compliance', description: 'Security best practices and compliance requirements' },
        { id: 'data-platform', name: 'Data Platform', description: 'Data architecture and analytics solutions' },
        { id: 'devops', name: 'DevOps & CI/CD', description: 'DevOps practices and automation' },
        { id: 'serverless', name: 'Serverless Architecture', description: 'Serverless patterns and best practices' },
      ]);
    }
  };

  const handleStartRecording = async () => {
    try {
      setIsRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      transcriptionRef.current = await startTranscription(stream, (entry: TranscriptEntry) => {
        setTranscript(prev => [...prev, entry]);
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      alert('Failed to access microphone. Please ensure microphone permissions are granted.');
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    if (transcriptionRef.current) {
      await stopTranscription(transcriptionRef.current);
      transcriptionRef.current = null;
    }
    
    // Generate summary when recording stops
    if (transcript.length > 0) {
      const summaryData = await generateSummary(transcript);
      setSummary(summaryData);
    }
  };

  const handleSaveAndClose = async () => {
    if (selectedProjects.length === 0) {
      alert('Please select at least one project to save to.');
      return;
    }

    setIsSaving(true);
    try {
      await saveTranscript(transcript, summary, selectedProjects);
      alert('Transcript saved successfully!');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">Architect Transcript Insights</h1>
            </div>
            <div className="flex items-center space-x-4">
              <ProjectSelector
                projects={projects}
                selectedProjects={selectedProjects}
                onSelectionChange={setSelectedProjects}
              />
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-5 w-5" />
                    <span>Stop Recording</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5" />
                    <span>Start Recording</span>
                  </>
                )}
              </button>
              <button
                onClick={handleSaveAndClose}
                disabled={transcript.length === 0 || isSaving}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Transcript */}
        <div className="w-1/3 border-r bg-white">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-800">Live Transcript</h2>
              {isRecording && (
                <span className="flex items-center space-x-1 text-sm text-red-500">
                  <span className="animate-pulse">●</span>
                  <span>Recording</span>
                </span>
              )}
            </div>
          </div>
          <TranscriptPanel transcript={transcript} />
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
    </div>
  );
}

export default App;