#!/bin/bash
set -e

# Setup Script for Claude Projects Integration
echo "🤖 Setting up Claude Projects for Architect Transcript Insights"
echo "=============================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Your Claude Projects have been configured:${NC}"
echo ""
echo "1. ARC-One SA (01983cde-a499-73f5-80df-2a28adc95a4b)"
echo "2. API Governance (0198849d-9ff8-77bd-9aaf-53c26ea60dbb)"
echo "3. Collections (0198af43-3f19-712a-819e-53048f53527d)"
echo "4. SOPs (01988137-d3be-74da-9c60-ce26f8abf76b)"
echo "5. Event Governance (019929e9-0515-767e-aec0-4ec7a754c933)"
echo "6. Interface Exception Dashboard (019884b1-6d02-76cc-922f-908590186a5d)"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from production template...${NC}"
    cp .env.production .env
    echo -e "${GREEN}✓ Created .env file${NC}"
else
    echo -e "${YELLOW}.env file already exists. Please update it manually with the Claude Project IDs.${NC}"
fi

# Update the .env file with Claude Project IDs if it doesn't have them
if ! grep -q "CLAUDE_PROJECT_IDS=" .env; then
    echo "" >> .env
    echo "# Your actual Claude Project IDs from claude.ai" >> .env
    echo "CLAUDE_PROJECT_IDS=01983cde-a499-73f5-80df-2a28adc95a4b,0198849d-9ff8-77bd-9aaf-53c26ea60dbb,0198af43-3f19-712a-819e-53048f53527d,01988137-d3be-74da-9c60-ce26f8abf76b,019929e9-0515-767e-aec0-4ec7a754c933,019884b1-6d02-76cc-922f-908590186a5d" >> .env
    echo -e "${GREEN}✓ Added Claude Project IDs to .env${NC}"
fi

echo ""
echo -e "${GREEN}✅ Claude Projects configuration complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Add your Anthropic API key to the .env file:"
echo "   ANTHROPIC_API_KEY=your-actual-api-key"
echo ""
echo "2. After Terraform deployment completes, update Cognito settings in .env"
echo ""
echo "3. Deploy to EC2 and start using your transcript insights tool!"
echo ""
echo -e "${BLUE}Your transcripts will be automatically uploaded to your Claude Projects!${NC}"