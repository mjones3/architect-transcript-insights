# Architect Transcript Insights Tool

A powerful real-time meeting transcription and insights tool designed for AWS Solutions Architects. This tool uses AWS Transcribe for live transcription with speaker identification, **Anthropic Claude API directly** for AI-powered summaries and architecture insights, and provides an intuitive interface for querying your **Claude Projects** knowledge base. Full transcripts are automatically uploaded to your Claude Projects for comprehensive knowledge management.

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph "Browser"
        UI[React Frontend]
        MIC[Microphone Input]
        WS[WebSocket Connection]
    end
    
    subgraph "Application Server"
        API[Express API Server]
        WSS[WebSocket Server]
    end
    
    subgraph "AI Services"
        CLAUDE[Anthropic Claude API<br/>3.5 Sonnet]
        PROJECTS[Claude Projects<br/>Knowledge Base]
    end
    
    subgraph "AWS Services"
        TRANSCRIBE[AWS Transcribe<br/>Streaming]
        S3[S3 Bucket<br/>Transcript Storage]
        BEDROCK[AWS Bedrock<br/>Fallback]
    end
    
    MIC --> UI
    UI <--> WS
    WS <--> WSS
    WSS --> API
    API --> TRANSCRIBE
    API --> CLAUDE
    API --> PROJECTS
    API --> S3
    API -.-> BEDROCK
    
    TRANSCRIBE -.-> WSS
    CLAUDE -.-> API
    PROJECTS <-.-> CLAUDE
    S3 -.-> API

    style UI fill:#e1f5fe
    style TRANSCRIBE fill:#fff3e0
    style CLAUDE fill:#f3e5f5
    style PROJECTS fill:#e8f5e8
    style S3 fill:#e0f2f1
```

## 🔄 Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant W as WebSocket
    participant A as API Server
    participant T as AWS Transcribe
    participant B as AWS Bedrock
    participant S as S3

    U->>F: Start Recording
    F->>W: Audio Stream
    W->>A: Audio Chunks
    A->>T: Stream Audio
    T-->>A: Transcript + Speaker ID
    A-->>W: Real-time Transcript
    W-->>F: Update UI
    
    Note over A,B: Every 30s during meeting
    A->>B: Generate Summary
    B-->>A: Summary + Action Items
    A-->>F: Update Summary Panel
    
    U->>F: Query Architecture
    F->>A: Question + Projects
    A->>B: Query with Context
    B-->>A: Answer + Sources
    A-->>F: Display Answer
    
    U->>F: Save & Close
    F->>A: Save Request
    A->>S: Store MD File
    S-->>A: Confirmation
    A-->>F: Success Message
```

## ✨ Features Overview

```mermaid
mindmap
  root((Architect<br/>Transcript<br/>Insights))
    Real-time Processing
      Live Transcription
      Speaker Identification
      Audio Streaming
      WebSocket Updates
    AI Intelligence
      Meeting Summaries
      Key Point Extraction
      Architecture Detection
      Action Item Tracking
    Knowledge Management
      Project Selection
      Query Interface
      Best Practices
      Source Attribution
    Storage & Export
      S3 Integration
      Markdown Export
      Project Tagging
      Version Control
    Deployment
      Terraform IaC
      Multi-Environment
      Scalable Architecture
      Security Best Practices
```

## 🔄 Complete Workflow

```mermaid
flowchart TD
    START([Solution Architect<br/>starts meeting]) --> SELECT[Select Projects<br/>from dropdown]
    SELECT --> CLICK[Click 'Start Recording']
    CLICK --> MIC{Microphone<br/>Permission?}
    
    MIC -->|Granted| STREAM[Audio streaming begins]
    MIC -->|Denied| ERROR[Show error message]
    ERROR --> CLICK
    
    STREAM --> TRANSCRIBE[Real-time transcription<br/>with speaker ID]
    TRANSCRIBE --> DISPLAY[Display in left panel]
    
    TRANSCRIBE --> SUMMARY[Generate summary<br/>every 30 seconds]
    SUMMARY --> HIGHLIGHT[Highlight architecture<br/>items in BOLD]
    HIGHLIGHT --> MIDDLE[Update middle panel]
    
    QUERY[User queries in right panel] --> AI[AWS Bedrock<br/>Claude 3 Sonnet]
    AI --> ANSWER[Architecture guidance<br/>based on best practices]
    ANSWER --> SHOW[Display with sources<br/>and confidence]
    
    STOP[Click 'Stop Recording'] --> FINAL[Generate final summary]
    FINAL --> SAVE{Click 'Save & Close'?}
    
    SAVE -->|Yes| EXPORT[Export to Markdown]
    EXPORT --> S3[Save to S3 bucket<br/>with project tags]
    S3 --> COMPLETE[Meeting complete!]
    
    SAVE -->|No| CONTINUE[Continue meeting]
    CONTINUE --> QUERY
    
    style HIGHLIGHT fill:#ffeb3b,stroke:#f57f17
    style AI fill:#e3f2fd,stroke:#1976d2
    style COMPLETE fill:#c8e6c9,stroke:#4caf50
```

## 🎯 Core Features

- **🎤 Live Transcription**: Real-time meeting transcription using AWS Transcribe with automatic speaker identification
- **👥 Speaker Diarization**: Automatically identifies and labels different speakers based on voice characteristics
- **🤖 Claude AI Integration**: Direct integration with Anthropic Claude 3.5 Sonnet for superior AI-powered summaries
- **📚 Claude Projects**: Query and update your Claude Projects knowledge base with full meeting transcripts
- **🏗️ Architecture Focus**: Automatically highlights and categorizes architecture-related discussions in **BOLD**
- **🔍 Knowledge Query**: Query your Claude Projects and get answers based on your accumulated project knowledge
- **💾 Dual Storage**: Full transcripts saved to both Claude Projects (for AI knowledge) and S3 (for archival)
- **📝 Complete Transcripts**: Uploads FULL transcripts (not just summaries) to Claude Projects for comprehensive knowledge

## Prerequisites

- Node.js 18+ and npm
- **Anthropic API Key** - For Claude AI integration
- AWS Account with appropriate permissions
- AWS CLI configured (optional, for deployment)
- Modern web browser with microphone access

## Services Required

### Primary AI Service
1. **Anthropic Claude API** - Direct Claude 3.5 Sonnet integration for summaries and queries
2. **Claude Projects** - Your EXISTING Claude Projects for knowledge management
   - 📖 **[See CLAUDE_SETUP.md](./CLAUDE_SETUP.md) for detailed setup instructions**

### AWS Services
1. **AWS Transcribe** - For real-time speech-to-text
2. **AWS S3** - For transcript archival storage
3. **AWS IAM** - For service permissions
4. **AWS Bedrock** (Optional) - Fallback for Claude API if needed

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/architect-transcript-insights.git
cd architect-transcript-insights
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure API Credentials

Copy the environment template and add your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your API keys and YOUR ACTUAL Claude Project IDs:

```env
# Primary - Anthropic Claude
ANTHROPIC_API_KEY=your-anthropic-api-key

# YOUR ACTUAL Claude Projects (get these from claude.ai)
# Replace with your real project IDs from your Claude account
CLAUDE_PROJECT_IDS=proj_abc123,proj_def456,proj_ghi789

# AWS Services
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=architect-transcripts
```

**Important**: The `CLAUDE_PROJECT_IDS` must be your ACTUAL Claude Project IDs from your claude.ai account, not example names.

### 4. Set Up AWS Resources

#### Create S3 Bucket

```bash
aws s3 mb s3://architect-transcripts --region us-east-1
```

#### Enable AWS Transcribe Streaming

Ensure your AWS account has access to Amazon Transcribe streaming API in your chosen region.

#### Enable AWS Bedrock

1. Go to AWS Bedrock console
2. Enable access to Claude 3 Sonnet model
3. Note: Bedrock is available in limited regions

### 5. Deploy Infrastructure with Terraform

Use the included Terraform configuration to set up all AWS resources:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your configuration
terraform init
terraform plan
terraform apply
```

This will create:
- S3 bucket with encryption and versioning
- IAM roles and policies with least privilege
- Security groups and CloudWatch logging
- Optional: Cognito, EC2, and Load Balancer

### 6. Run the Application

Start both the backend server and frontend:

```bash
npm start
```

Or run them separately:

```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run dev
```

Access the application at `http://localhost:3000`

## Usage Guide

### Starting a Meeting Transcription

1. **Select Claude Projects**: Check the boxes for Claude Projects in the header bar to:
   - ✅ Enable queries against their knowledge base
   - ✅ Upload the full transcript to these projects
   - ✅ Build cumulative knowledge over time
   - Each checked project will receive the complete transcript
2. **Start Recording**: Click the "Start Recording" button to begin transcription
3. **Grant Microphone Access**: Allow browser access to your microphone when prompted

### During the Meeting

- **Live Transcript**: View real-time transcription in the left panel
- **Speaker Identification**: Different speakers are automatically identified and color-coded
- **Claude AI Summary**: The middle panel updates periodically with:
  - Key discussion points
  - **Architecture decisions and considerations (in BOLD)**
  - **Architecture-related action items (in BOLD)**
  - Regular action items with assignees

### Querying Your Claude Projects

- Use the right panel to ask architecture-related questions
- Queries are answered using:
  - Your Claude Projects knowledge base (previous transcripts and documentation)
  - AWS Well-Architected Framework principles
  - Claude's extensive architecture knowledge
- Select specific projects to focus the query on their knowledge

### Saving Transcripts

- Click "Save & Close" to:
  1. **Upload FULL transcript to selected Claude Projects** (for AI knowledge base)
  2. **Save to S3** (for archival and compliance)
  3. **Download locally** (as backup)
- Transcripts include:
  - Complete unedited transcript with timestamps and confidence scores
  - AI-generated executive summary
  - Categorized action items with architecture items **in bold**
  - Full metadata and speaker information

## 📚 Claude Projects Integration

This tool deeply integrates with Claude Projects to build your knowledge base:

### Visual Project Selection

```
Header Bar:
┌─────────────────────────────────────────────────────────────────────┐
│  🧠 Architect Transcript Insights         [🎤 Start] [💾 Save & Close]│
├─────────────────────────────────────────────────────────────────────┤
│ Claude Projects: ☑ AWS Architecture  ☑ Microservices  ☐ Security   │
│                  ☑ Data Platform     ☐ DevOps        ☐ Serverless  │
│                                                      [3 selected]   │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
         Selected projects will receive full transcripts
                            ↓
    ┌──────────────┬──────────────┬──────────────┐
    │     AWS      │ Microservices│     Data     │
    │ Architecture │              │   Platform   │
    └──────────────┴──────────────┴──────────────┘
           ↑              ↑              ↑
    Full Transcript  Full Transcript  Full Transcript
    + Summary       + Summary       + Summary
    + Metadata      + Metadata      + Metadata
```

### What Gets Uploaded
- **Full Transcripts**: Complete, unedited meeting transcripts (not just summaries)
- **Rich Metadata**: Speaker information, timestamps, confidence scores
- **Structured Summaries**: Key points, architecture decisions, action items
- **Project Context**: Associated with specific Claude Projects for context

### How It Helps
1. **Knowledge Accumulation**: Each meeting adds to your project's knowledge base
2. **Contextual Queries**: Future queries can reference past meetings and decisions
3. **Pattern Recognition**: Claude learns your team's terminology and patterns
4. **Architecture Evolution**: Track how your architecture decisions evolve over time

### Project-Specific Benefits

| Claude Project | Use Case | Knowledge Built |
|----------------|----------|-----------------|
| AWS Architecture | Cloud design patterns | VPC configs, service selection, scaling decisions |
| Microservices | Service decomposition | API contracts, service boundaries, communication patterns |
| Security | Compliance & threats | Security controls, audit requirements, threat models |
| Data Platform | Data architecture | ETL pipelines, data models, analytics requirements |
| DevOps | CI/CD & automation | Pipeline configs, deployment strategies, monitoring |
| Serverless | Event-driven design | Lambda patterns, event flows, cost optimization |

## 🎨 User Interface Layout

```mermaid
graph TB
    subgraph "Header Bar - Two Rows"
        subgraph "Top Row"
            LOGO[App Logo & Title]
            RECORD[Record Button]
            SAVE[Save & Close]
        end
        
        subgraph "Bottom Row - Claude Projects"
            CHECK1[☑ AWS Architecture]
            CHECK2[☑ Microservices]
            CHECK3[☐ Security]
            CHECK4[☐ Data Platform]
            CHECK5[☑ DevOps]
            COUNT[3 selected]
        end
    end
    
    subgraph "Main Interface - 3 Panel Layout"
        subgraph "Left Panel"
            LT[Live Transcript]
            SPEAKERS[Speaker Identification]
            TIMESTAMP[Timestamps]
        end
        
        subgraph "Middle Panel"
            SUMMARY[Meeting Summary]
            KEY[Key Points]
            ARCH[Architecture Items<br/>Bold Highlights]
            ACTION[Action Items]
        end
        
        subgraph "Right Panel"
            QUERY[Query Interface]
            SUGGEST[Suggested Questions]
            ANSWERS[AI Responses]
            SOURCES[Sources & Confidence]
        end
    end
    
    style ARCH fill:#ffeb3b,stroke:#f57f17
    style QUERY fill:#e3f2fd,stroke:#1976d2
    style LT fill:#e8f5e8,stroke:#388e3c
```

## 🚀 Deployment Architecture Options

```mermaid
graph TB
    subgraph "Option 1: Simple Deployment"
        DEV1[Developer Laptop]
        DEV1 --> LOCALHOST[localhost:3000/3001]
    end
    
    subgraph "Option 2: EC2 Deployment"
        EC2[EC2 Instance<br/>t3.medium]
        ALB[Application Load Balancer]
        CF[CloudFront CDN]
        R53[Route 53 DNS]
        
        R53 --> CF
        CF --> ALB
        ALB --> EC2
    end
    
    subgraph "Option 3: Container Deployment"
        ECS[ECS Fargate]
        ECR[ECR Registry]
        ALB2[Application Load Balancer]
        
        ECR --> ECS
        ALB2 --> ECS
    end
    
    subgraph "Shared AWS Services"
        TR[AWS Transcribe]
        BR[AWS Bedrock]
        S3B[S3 Bucket]
        CW[CloudWatch Logs]
    end
    
    EC2 --> TR
    EC2 --> BR
    EC2 --> S3B
    EC2 --> CW
    
    ECS --> TR
    ECS --> BR
    ECS --> S3B
    ECS --> CW
```

## Project Structure

```mermaid
graph TD
    ROOT[architect-transcript-insights/]
    
    ROOT --> SRC[src/ - React Frontend]
    ROOT --> SERVER[server/ - Express Backend]
    ROOT --> TERRAFORM[terraform/ - Infrastructure]
    ROOT --> PUBLIC[public/ - Static Assets]
    
    SRC --> COMP[components/]
    SRC --> SERVICES[services/]
    SRC --> TYPES[types.ts]
    
    COMP --> PROJ[ProjectSelector.tsx]
    COMP --> TRANS[TranscriptPanel.tsx]
    COMP --> SUMM[SummaryPanel.tsx]
    COMP --> QUERY[QueryPanel.tsx]
    
    SERVER --> ROUTES[routes/]
    SERVER --> SSERVICES[services/]
    
    ROUTES --> AI[ai.ts - Bedrock Integration]
    ROUTES --> STORAGE[storage.ts - S3 Operations]
    ROUTES --> TRANSCRIBE[transcribe.ts - Streaming]
    
    SSERVICES --> BEDROCK[awsBedrock.ts]
    SSERVICES --> S3[awsS3.ts]
    SSERVICES --> TRANSC[awsTranscribe.ts]
    
    TERRAFORM --> MAIN[main.tf]
    TERRAFORM --> VARS[variables.tf]
    TERRAFORM --> OUTPUTS[outputs.tf]
    
    style SRC fill:#e3f2fd
    style SERVER fill:#fff3e0
    style TERRAFORM fill:#e8f5e8
```

## Deployment

### Deploy with Terraform (Recommended)

The easiest way to deploy is using the included Terraform configuration:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your configuration
terraform init
terraform apply
```

See [terraform/README.md](./terraform/README.md) for detailed deployment options.

### Deploy to AWS EC2 (Manual)

1. Launch an EC2 instance (t3.medium or larger)
2. Install Node.js and npm
3. Clone the repository
4. Set up environment variables
5. Install PM2 for process management:

```bash
npm install -g pm2
pm2 start npm --name "transcript-app" -- start
pm2 save
pm2 startup
```

### Deploy with Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000 3001
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t architect-transcript .
docker run -p 3000:3000 -p 3001:3001 --env-file .env architect-transcript
```

## Advanced Configuration

### Custom Speaker Profiles

Edit `server/services/awsTranscribe.ts` to add persistent speaker profiles:

```typescript
const knownSpeakers = {
  'voice-id-1': 'John Doe',
  'voice-id-2': 'Jane Smith'
};
```

### Project Knowledge Base

Integrate with existing knowledge bases by modifying `server/services/awsBedrock.ts`:

```typescript
// Add custom knowledge sources
const projectKnowledge = await getProjectDocuments(projectIds);
```

### Custom AI Prompts

Customize summary generation in `server/services/awsBedrock.ts`:

```typescript
function createSummaryPrompt(transcript) {
  // Modify prompt for specific focus areas
}
```

## Troubleshooting

### Microphone Not Working

1. Check browser permissions for microphone access
2. Ensure HTTPS connection (required for getUserMedia API)
3. Test microphone in browser settings

### AWS Transcribe Errors

1. Verify AWS credentials are correct
2. Check region supports Transcribe streaming
3. Ensure IAM permissions include transcribe:StartStreamTranscription

### Bedrock Not Available

1. Bedrock is only available in certain regions
2. Ensure Claude model access is enabled
3. Fall back to mock responses for development

## 🔒 Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        subgraph "Network Security"
            SG[Security Groups<br/>Port 443/80 only]
            WAF[AWS WAF<br/>DDoS Protection]
            VPC[Private VPC<br/>Isolated Network]
        end
        
        subgraph "Identity & Access"
            IAM[IAM Roles<br/>Least Privilege]
            COGNITO[Cognito Auth<br/>Optional]
            MFA[Multi-Factor Auth]
        end
        
        subgraph "Data Security"
            S3ENC[S3 Encryption<br/>AES-256]
            TRANSIT[TLS 1.2+<br/>In Transit]
            LOGS[CloudWatch Logs<br/>Encrypted]
        end
        
        subgraph "Application Security"
            ENV[Environment Variables<br/>No Hardcoded Secrets]
            CORS[CORS Policy<br/>Restricted Origins]
            RATE[Rate Limiting<br/>API Protection]
        end
    end
    
    subgraph "Monitoring & Compliance"
        TRAIL[CloudTrail<br/>API Logging]
        ALARM[CloudWatch Alarms<br/>Security Events]
        GUARD[GuardDuty<br/>Threat Detection]
    end
    
    style IAM fill:#ff9800,stroke:#e65100
    style S3ENC fill:#4caf50,stroke:#2e7d32
    style LOGS fill:#2196f3,stroke:#1565c0
```

## 🛡️ Security Best Practices

- **Never commit `.env` file** with real credentials
- Use IAM roles with minimal required permissions
- Enable S3 bucket encryption (AES-256)
- Implement authentication for production use
- Use HTTPS in production (TLS 1.2+)
- Sanitize file names before S3 upload
- Implement rate limiting on API endpoints
- Enable VPC flow logs for network monitoring
- Use AWS Secrets Manager for sensitive data
- Regular security scanning and updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - feel free to use this tool for your architecture meetings!

## Support

For issues, questions, or contributions, please open an issue on GitHub.

## 🗺️ Development Roadmap

```mermaid
timeline
    title Feature Development Roadmap
    
    section Phase 1 (Current)
        Core Features        : Live Transcription
                            : Speaker ID
                            : AI Summaries
                            : Architecture Query
                            : Multi-Project Support
    
    section Phase 2 (Q1)
        Authentication      : AWS Cognito Integration
                           : User Management
                           : Role-Based Access
        
        Enhanced AI         : Custom Vocabulary
                           : Technical Terms Recognition
                           : Better Architecture Detection
    
    section Phase 3 (Q2)
        Collaboration      : Real-time Sharing
                          : Team Workspaces
                          : Comment System
        
        Integrations       : JIRA Action Items
                          : Slack Notifications
                          : Teams Integration
    
    section Phase 4 (Q3)
        Advanced Features  : Video Recording
                          : Screen Sharing Capture
                          : Multi-language Support
        
        Export Options     : Confluence Export
                          : SharePoint Integration
                          : PowerPoint Generation
    
    section Phase 5 (Q4)
        Enterprise        : Offline Mode
                         : On-premise Deployment
                         : Advanced Analytics
                         : Compliance Features
```

## ✅ Current Implementation Status

- [x] ✅ Live transcription with AWS Transcribe
- [x] ✅ Speaker identification and diarization  
- [x] ✅ Real-time AI summaries with AWS Bedrock
- [x] ✅ Architecture-focused insights (bold highlighting)
- [x] ✅ Knowledge query interface
- [x] ✅ Multi-project selection and tagging
- [x] ✅ S3 storage with markdown export
- [x] ✅ Terraform infrastructure as code
- [x] ✅ Security best practices implementation
- [x] ✅ Comprehensive documentation

## 🚀 Upcoming Features

- [ ] 🔐 AWS Cognito authentication
- [ ] 🤝 Real-time collaboration features  
- [ ] 📤 Export to Confluence/SharePoint
- [ ] 🌍 Support multiple languages
- [ ] 📹 Video recording capability
- [ ] 📝 Custom vocabulary for technical terms
- [ ] 🎯 JIRA integration for action items
- [ ] 📱 Offline mode with sync

## Acknowledgments

Built with:
- React + TypeScript
- AWS SDK for JavaScript
- Tailwind CSS
- Express.js
- AWS Transcribe, Bedrock, and S3

---

**Made for AWS Solutions Architects, by Solutions Architects** 🏗️