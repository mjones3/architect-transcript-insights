export interface TranscriptEntry {
  id: string;
  timestamp: Date;
  speaker: string;
  text: string;
  confidence?: number;
}

export interface Speaker {
  id: string;
  name: string;
  voiceProfile?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
}

export interface MeetingSummary {
  keyPoints: string[];
  architectureItems: ArchitectureItem[];
  actionItems: ActionItem[];
  generatedAt: Date;
}

export interface ArchitectureItem {
  id: string;
  title: string;
  description: string;
  type: 'decision' | 'risk' | 'requirement' | 'constraint';
  priority?: 'high' | 'medium' | 'low';
}

export interface ActionItem {
  id: string;
  title: string;
  assignee?: string;
  dueDate?: Date;
  isArchitectureRelated: boolean;
}

export interface QueryResponse {
  question: string;
  answer: string;
  sources?: string[];
  confidence?: number;
}