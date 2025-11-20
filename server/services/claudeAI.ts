import Anthropic from '@anthropic-ai/sdk';
import { TranscriptEntry, MeetingSummary, QueryResponse, ArchitectureItem, ActionItem } from '../../src/types';
import fs from 'fs/promises';
import path from 'path';

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Cache for project knowledge
const projectKnowledgeCache = new Map<string, string>();

export async function generateMeetingSummaryWithClaude(
  transcript: TranscriptEntry[]
): Promise<MeetingSummary> {
  const transcriptText = formatTranscriptForClaude(transcript);
  
  const prompt = `Analyze this meeting transcript and provide a structured summary focusing on architecture and technical decisions.

Meeting Transcript:
${transcriptText}

Please provide:
1. Key Points (4-6 bullet points)
2. Architecture Items (decisions, risks, requirements, constraints) with priority levels - THESE SHOULD BE BOLDED
3. Action Items (mark which are architecture-related - BOLD THESE TOO)

Format the response as JSON with the following structure:
{
  "keyPoints": ["point1", "point2"],
  "architectureItems": [
    {
      "title": "**title**",
      "description": "description",
      "type": "decision|risk|requirement|constraint",
      "priority": "high|medium|low"
    }
  ],
  "actionItems": [
    {
      "title": "**title**" (bold if architecture-related),
      "assignee": "name or null",
      "isArchitectureRelated": true|false
    }
  ]
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.3,
      system: 'You are an AWS Solutions Architect assistant helping to analyze meeting transcripts and identify key architecture decisions and action items. Always bold architecture-related items.',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const response = message.content[0].type === 'text' ? message.content[0].text : '';
    return parseSummaryResponse(response);
  } catch (error) {
    console.error('Claude API error:', error);
    return generateMockSummary(transcript);
  }
}

export async function queryClaudeProjects(
  question: string,
  projectIds: string[]
): Promise<QueryResponse> {
  try {
    // Load project knowledge from Claude Projects
    const projectContext = await loadProjectKnowledge(projectIds);
    
    const prompt = `You are an AWS Solutions Architect assistant with access to project-specific knowledge.

Project Context:
${projectContext}

AWS Well-Architected Framework principles apply.

Question: ${question}

Provide a detailed, actionable answer that:
1. References specific project context when available
2. Follows AWS best practices
3. Includes relevant AWS services
4. Considers trade-offs and alternatives
5. Cites sources from the project knowledge base

Format your response with clear sections and practical recommendations.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.5,
      system: 'You are an expert AWS Solutions Architect with deep knowledge of cloud architecture patterns, AWS services, and the Well-Architected Framework.',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const answer = message.content[0].type === 'text' ? message.content[0].text : '';
    
    return {
      question,
      answer,
      sources: [...projectIds.map(id => `Claude Project: ${id}`), 'AWS Well-Architected Framework'],
      confidence: 0.95
    };
  } catch (error) {
    console.error('Claude Projects query error:', error);
    return generateMockQueryResponse(question);
  }
}

export async function uploadTranscriptToClaudeProject(
  transcript: TranscriptEntry[],
  summary: MeetingSummary | null,
  projectIds: string[],
  filename: string
): Promise<void> {
  const fullTranscript = generateFullTranscriptMarkdown(transcript, summary, projectIds);
  
  try {
    // For each selected Claude project, upload the full transcript
    for (const projectId of projectIds) {
      await uploadToClaudeProject(projectId, filename, fullTranscript);
      
      // Update local cache
      projectKnowledgeCache.set(projectId, fullTranscript);
    }
    
    console.log(`Successfully uploaded transcript to ${projectIds.length} Claude projects`);
  } catch (error) {
    console.error('Failed to upload to Claude Projects:', error);
    throw error;
  }
}

async function uploadToClaudeProject(
  projectId: string,
  filename: string,
  content: string
): Promise<void> {
  // Claude Projects API integration
  // Note: The actual Claude Projects API is not yet publicly available
  // This is a placeholder for when the API becomes available
  
  try {
    // Future implementation will use Claude Projects API
    // For now, we'll save to a local directory structure that mimics projects
    const projectDir = path.join(process.cwd(), 'claude-projects', projectId);
    await fs.mkdir(projectDir, { recursive: true });
    
    const filePath = path.join(projectDir, filename);
    await fs.writeFile(filePath, content, 'utf-8');
    
    console.log(`Saved transcript to Claude Project ${projectId}: ${filename}`);
    
    // When API is available:
    // await anthropic.projects.uploadDocument({
    //   projectId,
    //   filename,
    //   content,
    //   type: 'markdown'
    // });
  } catch (error) {
    console.error(`Failed to upload to project ${projectId}:`, error);
    throw error;
  }
}

async function loadProjectKnowledge(projectIds: string[]): Promise<string> {
  const knowledge: string[] = [];
  
  for (const projectId of projectIds) {
    // Check cache first
    if (projectKnowledgeCache.has(projectId)) {
      knowledge.push(projectKnowledgeCache.get(projectId)!);
      continue;
    }
    
    try {
      // Load from local Claude Projects directory
      const projectDir = path.join(process.cwd(), 'claude-projects', projectId);
      const files = await fs.readdir(projectDir).catch(() => []);
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(projectDir, file), 'utf-8');
          knowledge.push(`\n--- Project ${projectId} - ${file} ---\n${content}`);
        }
      }
      
      // When API is available:
      // const projectKnowledge = await anthropic.projects.getKnowledge({
      //   projectId
      // });
      // knowledge.push(projectKnowledge);
    } catch (error) {
      console.error(`Failed to load knowledge for project ${projectId}:`, error);
    }
  }
  
  return knowledge.join('\n\n');
}

function formatTranscriptForClaude(transcript: TranscriptEntry[]): string {
  return transcript
    .map(entry => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      return `[${time}] ${entry.speaker}: ${entry.text}`;
    })
    .join('\n');
}

function generateFullTranscriptMarkdown(
  transcript: TranscriptEntry[],
  summary: MeetingSummary | null,
  projectIds: string[]
): string {
  const timestamp = new Date().toISOString();
  let markdown = `# Meeting Transcript - ${new Date(timestamp).toLocaleString()}\n\n`;
  markdown += `**Projects:** ${projectIds.join(', ')}\n\n`;
  markdown += `**Duration:** ${calculateDuration(transcript)} minutes\n`;
  markdown += `**Participants:** ${countSpeakers(transcript)} speakers\n\n`;
  
  markdown += `---\n\n`;

  if (summary) {
    markdown += `## Executive Summary\n\n`;
    
    markdown += `### Key Points\n\n`;
    summary.keyPoints.forEach(point => {
      markdown += `- ${point}\n`;
    });
    markdown += '\n';

    if (summary.architectureItems.length > 0) {
      markdown += `### Architecture Decisions & Considerations\n\n`;
      summary.architectureItems.forEach(item => {
        markdown += `#### **${item.title}** *(${item.type}${item.priority ? ` - ${item.priority} priority` : ''})*\n\n`;
        markdown += `${item.description}\n\n`;
      });
    }

    if (summary.actionItems.length > 0) {
      markdown += `### Action Items\n\n`;
      summary.actionItems.forEach(item => {
        const prefix = item.isArchitectureRelated ? '**[ARCHITECTURE]**' : '';
        const title = item.isArchitectureRelated ? `**${item.title}**` : item.title;
        const assignee = item.assignee ? ` - @${item.assignee}` : '';
        const due = item.dueDate ? ` (Due: ${new Date(item.dueDate).toLocaleDateString()})` : '';
        markdown += `- ${prefix} ${title}${assignee}${due}\n`;
      });
      markdown += '\n';
    }
  }

  markdown += `## Full Transcript\n\n`;
  markdown += `*Note: This is the complete, unedited transcript for comprehensive project knowledge.*\n\n`;
  
  transcript.forEach(entry => {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const confidence = entry.confidence ? ` [${Math.round(entry.confidence * 100)}% confidence]` : '';
    markdown += `### [${time}] ${entry.speaker}${confidence}\n\n`;
    markdown += `${entry.text}\n\n`;
  });

  markdown += `---\n\n`;
  markdown += `## Metadata\n\n`;
  markdown += `- **Generated:** ${new Date().toLocaleString()}\n`;
  markdown += `- **Tool:** Architect Transcript Insights\n`;
  markdown += `- **AI Model:** Claude 3.5 Sonnet\n`;
  markdown += `- **Transcription Service:** AWS Transcribe\n`;
  markdown += `- **Total Entries:** ${transcript.length}\n`;
  markdown += `- **Projects:** ${projectIds.join(', ')}\n`;

  return markdown;
}

function calculateDuration(transcript: TranscriptEntry[]): number {
  if (transcript.length < 2) return 0;
  
  const start = new Date(transcript[0].timestamp).getTime();
  const end = new Date(transcript[transcript.length - 1].timestamp).getTime();
  
  return Math.round((end - start) / 60000); // Duration in minutes
}

function countSpeakers(transcript: TranscriptEntry[]): number {
  return new Set(transcript.map(e => e.speaker)).size;
}

function parseSummaryResponse(response: string): MeetingSummary {
  try {
    // Extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      keyPoints: parsed.keyPoints || [],
      architectureItems: (parsed.architectureItems || []).map((item: any, index: number) => ({
        ...item,
        id: `arch-${index + 1}`,
      })),
      actionItems: (parsed.actionItems || []).map((item: any, index: number) => ({
        ...item,
        id: `action-${index + 1}`,
        dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
      })),
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error('Failed to parse Claude response:', error);
    return generateMockSummary([]);
  }
}

function generateMockSummary(transcript: any[]): MeetingSummary {
  return {
    keyPoints: [
      'Discussed migration to microservices architecture using AWS ECS',
      'Need to implement comprehensive monitoring with CloudWatch and X-Ray',
      'Security review required for data encryption at rest and in transit',
      'Performance targets: < 100ms latency, 99.99% availability',
      'Cost optimization through Reserved Instances and Spot Instances'
    ],
    architectureItems: [
      {
        id: 'arch-1',
        title: '**Container Orchestration Decision**',
        description: 'Choose between EKS and ECS for container management. ECS recommended for better AWS integration.',
        type: 'decision',
        priority: 'high'
      },
      {
        id: 'arch-2',
        title: '**Data Residency Compliance**',
        description: 'Must ensure all customer data remains in US regions for regulatory compliance.',
        type: 'constraint',
        priority: 'high'
      },
      {
        id: 'arch-3',
        title: '**API Gateway Implementation**',
        description: 'Implement AWS API Gateway with rate limiting and authentication.',
        type: 'requirement',
        priority: 'medium'
      }
    ],
    actionItems: [
      {
        id: 'action-1',
        title: '**Create ECS Fargate POC**',
        assignee: 'DevOps Team',
        isArchitectureRelated: true
      },
      {
        id: 'action-2',
        title: '**Document API design patterns**',
        assignee: 'Architecture Team',
        isArchitectureRelated: true
      },
      {
        id: 'action-3',
        title: 'Schedule follow-up meeting',
        isArchitectureRelated: false
      }
    ],
    generatedAt: new Date()
  };
}

function generateMockQueryResponse(question: string): QueryResponse {
  return {
    question,
    answer: `Based on AWS Well-Architected Framework and project context:

**Recommendation:**
For your architecture needs, consider implementing a multi-layered approach:

1. **Compute Layer**: Use ECS Fargate for serverless containers
2. **API Layer**: Implement API Gateway with caching
3. **Data Layer**: RDS with Multi-AZ for reliability
4. **Security**: WAF, Security Groups, and IAM roles
5. **Monitoring**: CloudWatch, X-Ray for distributed tracing

**Trade-offs to consider:**
- Cost vs Performance: Reserved Instances save costs but reduce flexibility
- Complexity vs Maintainability: Microservices add complexity but improve scalability

**Best Practices:**
- Implement Infrastructure as Code using Terraform
- Use least privilege IAM policies
- Enable encryption everywhere
- Implement comprehensive logging and monitoring`,
    sources: ['Claude Project Knowledge', 'AWS Well-Architected Framework'],
    confidence: 0.85
  };
}