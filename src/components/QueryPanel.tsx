import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader, HelpCircle, Cpu } from 'lucide-react';
import { QueryResponse } from '../types';
import { queryArchitectureKnowledge } from '../services/ai';

interface QueryPanelProps {
  selectedProjects: string[];
}

export default function QueryPanel({ selectedProjects }: QueryPanelProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<QueryResponse[]>([]);
  const [claudeProjects, setClaudeProjects] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [responses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userQuery = query.trim();
    setQuery('');
    setIsLoading(true);

    try {
      const response = await queryArchitectureKnowledge(userQuery, selectedProjects);
      setResponses(prev => [...prev, response]);
    } catch (error) {
      console.error('Query failed:', error);
      setResponses(prev => [...prev, {
        question: userQuery,
        answer: 'Sorry, I encountered an error processing your query. Please try again.',
        confidence: 0
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQueries = [
    'What are the key architectural decisions discussed?',
    'What are the main technical risks identified?',
    'What cloud services were mentioned?',
    'Are there any security considerations?',
    'What are the scalability requirements?'
  ];

  return (
    <div className="h-[calc(100%-73px)] flex flex-col">
      {/* Query History */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {responses.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center text-gray-400 py-8">
              <Cpu className="h-12 w-12 mx-auto mb-3" />
              <p className="text-sm">Ask about architecture best practices</p>
              <p className="text-xs mt-1">Get insights based on selected projects</p>
            </div>
            
            {/* Suggested Queries */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">Suggested queries:</p>
              {suggestedQueries.map((sq, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(sq)}
                  className="w-full text-left text-sm p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <HelpCircle className="inline h-3 w-3 mr-2 text-gray-400" />
                  {sq}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {responses.map((response, index) => (
              <div key={index} className="space-y-2">
                {/* Question */}
                <div className="bg-indigo-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-indigo-700">{response.question}</p>
                </div>
                
                {/* Answer */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{response.answer}</p>
                  
                  {/* Sources */}
                  {response.sources && response.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">Sources:</p>
                      <ul className="mt-1 space-y-1">
                        {response.sources.map((source, idx) => (
                          <li key={idx} className="text-xs text-gray-400">• {source}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Confidence */}
                  {response.confidence !== undefined && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400">Confidence:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full"
                            style={{ width: `${response.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {Math.round(response.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader className="h-5 w-5 animate-spin text-indigo-500" />
                <span className="ml-2 text-sm text-gray-500">Thinking...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Query Input */}
      <div className="border-t bg-gray-50 p-4">
        {selectedProjects.length === 0 ? (
          <div className="mb-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
            Select Claude Projects in the header to query their knowledge base
          </div>
        ) : (
          <div className="mb-2 text-xs text-green-700 bg-green-50 p-2 rounded">
            Querying {selectedProjects.length} Claude Project{selectedProjects.length > 1 ? 's' : ''}: {selectedProjects.join(', ')}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about architecture best practices..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}