import React from 'react';
import { Database, Upload, Search, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface ProjectStatusBarProps {
  selectedCount: number;
  isRecording: boolean;
  hasTranscript: boolean;
}

export default function ProjectStatusBar({ selectedCount, isRecording, hasTranscript }: ProjectStatusBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bg-indigo-50 border-t border-indigo-200 px-6 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2 text-indigo-700">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">{selectedCount} Claude Project{selectedCount > 1 ? 's' : ''} Selected</span>
          </div>
          
          <div className="flex items-center space-x-4 text-indigo-600">
            <div className="flex items-center space-x-1">
              <Search className="h-3 w-3" />
              <span className="text-xs">Queries enabled</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Database className="h-3 w-3" />
              <span className="text-xs">Knowledge accessible</span>
            </div>
            
            {hasTranscript && (
              <div className="flex items-center space-x-1">
                <Upload className="h-3 w-3" />
                <span className="text-xs">Will upload full transcript</span>
              </div>
            )}
            
            {isRecording && (
              <div className="flex items-center space-x-1 text-red-500 animate-pulse">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs">Recording</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-xs text-indigo-600">
          Each project will receive: <span className="font-semibold">Full transcript + Summary + Metadata</span>
        </div>
      </div>
    </div>
  );
}