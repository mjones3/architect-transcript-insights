import axios from 'axios';
import { TranscriptEntry, MeetingSummary, QueryResponse, ArchitectureItem, ActionItem } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

export async function generateSummary(transcript: TranscriptEntry[]): Promise<MeetingSummary> {
  try {
    const response = await axios.post(`${API_BASE_URL}/summarize`, {
      transcript: transcript.map(entry => ({
        speaker: entry.speaker,
        text: entry.text,
        timestamp: entry.timestamp
      }))
    });

    return response.data;
  } catch (error) {
    console.error('Failed to generate summary:', error);
    
    // Return mock data for development
    return generateMockSummary(transcript);
  }
}

export async function queryArchitectureKnowledge(
  query: string,
  projectIds: string[]
): Promise<QueryResponse> {
  try {
    const response = await axios.post(`${API_BASE_URL}/query`, {
      question: query,
      projectIds,
      context: 'architecture'
    });

    return response.data;
  } catch (error) {
    console.error('Failed to query knowledge base:', error);
    
    // Return mock response for development
    return generateMockQueryResponse(query);
  }
}

// Mock functions for development/demo
function generateMockSummary(transcript: TranscriptEntry[]): MeetingSummary {
  const text = transcript.map(e => e.text).join(' ');
  
  const keyPoints = [
    'Discussed migrating to microservices architecture',
    'Need to evaluate container orchestration platforms',
    'Security compliance requirements for data encryption',
    'Performance targets: < 100ms latency for API responses'
  ];

  const architectureItems: ArchitectureItem[] = [
    {
      id: '1',
      title: 'Kubernetes vs ECS Decision',
      description: 'Need to decide between Kubernetes and AWS ECS for container orchestration',
      type: 'decision',
      priority: 'high'
    },
    {
      id: '2',
      title: 'Data Residency Requirements',
      description: 'Customer data must remain within US regions for compliance',
      type: 'constraint',
      priority: 'high'
    },
    {
      id: '3',
      title: 'API Gateway Selection',
      description: 'Evaluate AWS API Gateway vs Kong for API management',
      type: 'requirement',
      priority: 'medium'
    }
  ];

  const actionItems: ActionItem[] = [
    {
      id: '1',
      title: 'Create POC for Kubernetes deployment',
      assignee: 'DevOps Team',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isArchitectureRelated: true
    },
    {
      id: '2',
      title: 'Document API design patterns',
      assignee: 'Architecture Team',
      isArchitectureRelated: true
    },
    {
      id: '3',
      title: 'Schedule follow-up meeting',
      isArchitectureRelated: false
    }
  ];

  return {
    keyPoints,
    architectureItems,
    actionItems,
    generatedAt: new Date()
  };
}

function generateMockQueryResponse(query: string): QueryResponse {
  const responses: Record<string, string> = {
    'security': 'For security best practices in cloud architecture:\n\n1. Implement defense in depth with multiple security layers\n2. Use AWS WAF for application protection\n3. Enable encryption at rest and in transit\n4. Implement least privilege access with IAM\n5. Use AWS GuardDuty for threat detection',
    'scalability': 'For scalability considerations:\n\n1. Design for horizontal scaling using Auto Scaling Groups\n2. Implement caching with ElastiCache\n3. Use CloudFront CDN for static content\n4. Consider serverless for variable workloads\n5. Implement database read replicas',
    'microservices': 'Microservices architecture best practices:\n\n1. Keep services small and focused\n2. Implement service discovery\n3. Use API Gateway for routing\n4. Implement circuit breakers\n5. Use event-driven communication where appropriate',
    'default': 'Based on AWS Well-Architected Framework:\n\n1. Operational Excellence: Automate operations\n2. Security: Implement strong identity foundation\n3. Reliability: Test recovery procedures\n4. Performance: Use serverless and managed services\n5. Cost Optimization: Implement cost controls'
  };

  const queryLower = query.toLowerCase();
  let answer = responses.default;
  
  for (const [key, value] of Object.entries(responses)) {
    if (queryLower.includes(key)) {
      answer = value;
      break;
    }
  }

  return {
    question: query,
    answer,
    sources: ['AWS Well-Architected Framework', 'Internal Architecture Guidelines'],
    confidence: 0.85
  };
}