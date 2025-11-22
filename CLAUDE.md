# Claude Session State - Architect Transcript Insights

## Project Overview
This is a real-time meeting transcription and AI insights platform for AWS Solutions Architects. It provides live transcription, speaker identification, AI summaries, and integration with Claude Projects.

## Current Infrastructure Status
- **AWS Account**: 294417223953
- **Region**: us-east-1
- **Load Balancer**: http://architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com
- **EC2 Instance**: i-021318587cae1ac80 (IP: 54.89.55.82)
- **S3 Bucket**: architect-transcripts-294417223953-prod
- **Domain**: insights.melvin-jones.com (SSL cert ready, not yet configured)

## Known Issues & TODOs
- [ ] Node.js 18 incompatible with Amazon Linux 2 (glibc version issue)
- [ ] Full application not deployed (only placeholder running)
- [ ] Need to set up proper CI/CD pipeline
- [ ] API keys need to be added (ANTHROPIC_API_KEY, CLAUDE_PROJECT_IDS)
- [ ] WebSocket connection for real-time transcription not configured
- [ ] Cognito authentication not fully integrated

## Development Environment
- **Local Directory**: /Users/mjones/work/architect-transcript-insights
- **Node Version Required**: 16.x (for Amazon Linux 2) or 18.x (for local/modern systems)
- **SSH Key Location**: ~/Downloads/melvin-jones.com-pair.pem

## Key Files & Scripts
- `deploy-from-local.sh` - Main deployment script
- `package-deploy.json` - Production package.json with working dependencies
- `terraform/` - Infrastructure as Code
- `server/` - Express.js backend with WebSocket support
- `src/` - React frontend

## API Keys Needed
```env
ANTHROPIC_API_KEY=<needs to be added>
CLAUDE_PROJECT_IDS=<comma-separated project IDs>
COGNITO_USER_POOL_ID=<from terraform output>
COGNITO_CLIENT_ID=<from terraform output>
```

## Deployment Commands
```bash
# SSH to EC2
ssh -i ~/Downloads/melvin-jones.com-pair.pem ec2-user@54.89.55.82

# Deploy from local
./deploy-iterative.sh

# Check logs on EC2
pm2 logs

# Check application status
curl http://architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com/health
```

## Architecture Decisions Made
1. Using Python for health checks (Node.js compatibility issues)
2. Nginx as reverse proxy on port 80/3000
3. PM2 for process management
4. S3 for deployment artifacts
5. Load Balancer for high availability

## Next Session TODOs
1. Fix Node.js installation on EC2 (use nvm or Docker)
2. Deploy full application (not just placeholder)
3. Configure WebSocket for real-time features
4. Add API keys securely
5. Set up automated deployment pipeline
6. Test audio recording and transcription

## Recent Changes Log
- 2024-11-22: Initial infrastructure deployed via Terraform
- 2024-11-22: Basic Python health check server deployed
- 2024-11-22: Nginx configured as reverse proxy
- 2024-11-22: Load balancer returning 200 OK (basic functionality)