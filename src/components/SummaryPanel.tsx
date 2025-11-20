import React from 'react';
import { AlertCircle, CheckCircle, Target, Zap, FileText } from 'lucide-react';
import { MeetingSummary } from '../types';

interface SummaryPanelProps {
  summary: MeetingSummary | null;
}

export default function SummaryPanel({ summary }: SummaryPanelProps) {
  if (!summary) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3" />
          <p className="text-sm">No summary available</p>
          <p className="text-xs mt-1">Summary will appear as the meeting progresses</p>
        </div>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'decision':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'risk':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'requirement':
        return <Target className="h-4 w-4 text-blue-500" />;
      case 'constraint':
        return <Zap className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-[calc(100%-73px)] overflow-y-auto p-4 space-y-6">
      {/* Key Points */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Key Points</h3>
        <ul className="space-y-2">
          {summary.keyPoints.map((point, index) => (
            <li key={index} className="flex items-start">
              <span className="text-indigo-500 mr-2">•</span>
              <span className="text-sm text-gray-600">{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Architecture Items */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Architecture Considerations
        </h3>
        <div className="space-y-2">
          {summary.architectureItems.map((item) => (
            <div
              key={item.id}
              className="bg-indigo-50 border border-indigo-200 rounded-lg p-3"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center space-x-2">
                  {getTypeIcon(item.type)}
                  <span className="font-bold text-sm text-gray-800">
                    {item.title}
                  </span>
                </div>
                {item.priority && (
                  <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Items */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Action Items</h3>
        <div className="space-y-2">
          {summary.actionItems.map((item) => (
            <div
              key={item.id}
              className={`rounded-lg p-3 ${
                item.isArchitectureRelated
                  ? 'bg-indigo-50 border border-indigo-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm ${
                    item.isArchitectureRelated ? 'font-bold text-indigo-700' : 'text-gray-700'
                  }`}
                >
                  {item.title}
                </span>
                {item.assignee && (
                  <span className="text-xs text-gray-500">@{item.assignee}</span>
                )}
              </div>
              {item.dueDate && (
                <span className="text-xs text-gray-400">
                  Due: {new Date(item.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Generated timestamp */}
      <div className="text-xs text-gray-400 text-center pt-2 border-t">
        Last updated: {new Date(summary.generatedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}