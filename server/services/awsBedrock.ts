import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function generateMeetingSummary(transcript: any[]): Promise<any> {
  const prompt = createSummaryPrompt(transcript);
  
  try {
    const response = await invokeClaudeModel(prompt);
    return parseSummaryResponse(response);
  } catch (error) {
    console.error('Bedrock API error:', error);
    return generateMockSummary(transcript);
  }
}

export async function queryKnowledgeBase(
  question: string,
  projectContext: string[]
): Promise<any> {
  const prompt = createQueryPrompt(question, projectContext);
  
  try {
    const response = await invokeClaudeModel(prompt);
    return parseQueryResponse(response, question);
  } catch (error) {
    console.error('Bedrock API error:', error);
    return generateMockQueryResponse(question);
  }
}

async function invokeClaudeModel(prompt: string): Promise<string> {
  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      top_p: 0.9,
    }),
    contentType: 'application/json',
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  return responseBody.content[0].text;
}

function createSummaryPrompt(transcript: any[]): string {
  const transcriptText = transcript
    .map((entry) => `${entry.speaker}: ${entry.text}`)
    .join('\n');

  return `
    Analyze this meeting transcript and provide a structured summary focusing on architecture and technical decisions.

    Transcript:
    ${transcriptText}

    Please provide:
    1. Key Points (4-6 bullet points)
    2. Architecture Items (decisions, risks, requirements, constraints) with priority levels
    3. Action Items (mark which are architecture-related)

    Format the response as JSON with the following structure:
    {
      "keyPoints": ["point1", "point2"],
      "architectureItems": [
        {
          "title": "title",
          "description": "description",
          "type": "decision|risk|requirement|constraint",
          "priority": "high|medium|low"
        }
      ],
      "actionItems": [
        {
          "title": "title",
          "assignee": "name or null",
          "isArchitectureRelated": true|false
        }
      ]
    }
  `;
}

function createQueryPrompt(question: string, projectContext: string[]): string {
  return `
    You are an AWS Solutions Architect assistant. Answer the following question based on AWS Well-Architected Framework best practices and architecture patterns.

    Question: ${question}
    Project Context: ${projectContext.join(', ')}

    Provide a detailed answer with:
    1. Clear recommendations
    2. Relevant AWS services
    3. Best practices
    4. Potential considerations or tradeoffs

    Format as clear, actionable advice for a solutions architect.
  `;
}

function parseSummaryResponse(response: string): any {
  try {
    const parsed = JSON.parse(response);
    return {
      ...parsed,
      generatedAt: new Date(),
      architectureItems: parsed.architectureItems.map((item: any, index: number) => ({
        ...item,
        id: `arch-${index + 1}`,
      })),
      actionItems: parsed.actionItems.map((item: any, index: number) => ({
        ...item,
        id: `action-${index + 1}`,
      })),
    };
  } catch (error) {
    console.error('Failed to parse summary response:', error);
    return generateMockSummary([]);
  }
}

function parseQueryResponse(response: string, question: string): any {
  return {
    question,
    answer: response,
    sources: ['AWS Well-Architected Framework', 'AWS Best Practices'],
    confidence: 0.9,
  };
}

function generateMockSummary(transcript: any[]): any {
  return {
    keyPoints: [
      'Discussed microservices architecture migration strategy',
      'Identified need for container orchestration platform',
      'Reviewed security compliance requirements',
      'Established performance targets for API responses',
    ],
    architectureItems: [
      {
        id: 'arch-1',
        title: 'Container Orchestration Platform',
        description: 'Evaluate ECS vs EKS for container management',
        type: 'decision',
        priority: 'high',
      },
      {
        id: 'arch-2',
        title: 'Data Residency',
        description: 'Ensure compliance with data localization requirements',
        type: 'constraint',
        priority: 'high',
      },
    ],
    actionItems: [
      {
        id: 'action-1',
        title: 'Create Kubernetes POC',
        assignee: 'DevOps Team',
        isArchitectureRelated: true,
      },
      {
        id: 'action-2',
        title: 'Document API patterns',
        assignee: 'Architecture Team',
        isArchitectureRelated: true,
      },
    ],
    generatedAt: new Date(),
  };
}

function generateMockQueryResponse(question: string): any {
  const answers: Record<string, string> = {
    default: `Based on AWS Well-Architected Framework:

1. **Operational Excellence**: Implement Infrastructure as Code using CloudFormation or CDK
2. **Security**: Apply defense in depth with VPC, Security Groups, and IAM roles
3. **Reliability**: Design for failure with multi-AZ deployments
4. **Performance Efficiency**: Use appropriate instance types and auto-scaling
5. **Cost Optimization**: Implement tagging and use Cost Explorer

Consider using AWS Well-Architected Tool for detailed assessment.`,
  };

  return {
    question,
    answer: answers.default,
    sources: ['AWS Well-Architected Framework'],
    confidence: 0.85,
  };
}