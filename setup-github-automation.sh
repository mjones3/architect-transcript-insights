#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Setting up GitHub Automation ===${NC}"
echo "This script will help you configure GitHub for automated deployments"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}GitHub CLI not found. Please install it:${NC}"
    echo "brew install gh"
    echo "or visit: https://cli.github.com/"
    exit 1
fi

# Check if user is logged into GitHub
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}Please login to GitHub CLI:${NC}"
    gh auth login
fi

echo -e "\n${YELLOW}Step 1: Create/configure GitHub repository${NC}"
read -p "Do you want to create a new GitHub repository? (y/n): " CREATE_REPO

if [ "$CREATE_REPO" = "y" ]; then
    read -p "Repository name [architect-transcript-insights]: " REPO_NAME
    REPO_NAME=${REPO_NAME:-architect-transcript-insights}
    
    echo "Creating GitHub repository..."
    gh repo create $REPO_NAME --public --description "Real-time meeting transcription and AI insights platform"
    
    # Add remote
    git remote add origin https://github.com/$(gh api user --jq .login)/$REPO_NAME.git
    
    echo -e "${GREEN}✓ Repository created${NC}"
else
    echo "Using existing repository configuration"
fi

echo -e "\n${YELLOW}Step 2: Configure GitHub Secrets${NC}"
echo "Setting up required secrets for automated deployment..."

# AWS Access Key
if ! gh secret list | grep -q "AWS_ACCESS_KEY_ID"; then
    echo "Enter your AWS Access Key ID:"
    read -s AWS_ACCESS_KEY
    gh secret set AWS_ACCESS_KEY_ID --body "$AWS_ACCESS_KEY"
    echo -e "${GREEN}✓ AWS_ACCESS_KEY_ID set${NC}"
fi

# AWS Secret Key
if ! gh secret list | grep -q "AWS_SECRET_ACCESS_KEY"; then
    echo "Enter your AWS Secret Access Key:"
    read -s AWS_SECRET_KEY
    gh secret set AWS_SECRET_ACCESS_KEY --body "$AWS_SECRET_KEY"
    echo -e "${GREEN}✓ AWS_SECRET_ACCESS_KEY set${NC}"
fi

# EC2 Private Key
if ! gh secret list | grep -q "EC2_PRIVATE_KEY"; then
    echo -e "\n${YELLOW}Setting up EC2 SSH key...${NC}"
    KEY_PATH="$HOME/Downloads/melvin-jones.com-pair.pem"
    
    if [ -f "$KEY_PATH" ]; then
        gh secret set EC2_PRIVATE_KEY < "$KEY_PATH"
        echo -e "${GREEN}✓ EC2_PRIVATE_KEY set${NC}"
    else
        echo -e "${YELLOW}EC2 key not found at $KEY_PATH${NC}"
        echo "Please provide the path to your EC2 private key:"
        read -p "Key path: " CUSTOM_KEY_PATH
        if [ -f "$CUSTOM_KEY_PATH" ]; then
            gh secret set EC2_PRIVATE_KEY < "$CUSTOM_KEY_PATH"
            echo -e "${GREEN}✓ EC2_PRIVATE_KEY set${NC}"
        else
            echo "Key file not found. Please set this manually in GitHub repository settings."
        fi
    fi
fi

echo -e "\n${YELLOW}Step 3: Push to GitHub and trigger first deployment${NC}"

# Commit all changes
git add .
git commit -m "Add GitHub Actions for automated deployment" --allow-empty

# Push to GitHub
echo "Pushing to GitHub..."
git push -u origin main

echo -e "\n${GREEN}=== Setup Complete! ===${NC}"
echo -e "${GREEN}GitHub repository is configured with automated deployment${NC}"
echo ""
echo -e "${YELLOW}How it works now:${NC}"
echo "1. You make changes locally and commit them"
echo "2. Push to main branch: 'git push'"
echo "3. GitHub Actions automatically deploys to EC2"
echo "4. CLAUDE.md is automatically updated with deployment info"
echo ""
echo -e "${YELLOW}Your workflow:${NC}"
echo '```bash'
echo 'git add .'
echo 'git commit -m "Your changes"'
echo 'git push  # Triggers automatic deployment'
echo '```'
echo ""
echo -e "${YELLOW}Monitor deployments:${NC}"
echo "GitHub Actions: https://github.com/$(gh api user --jq .login)/$(basename $(pwd))/actions"
echo "Application: http://architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com"
echo ""
echo -e "${BLUE}Next time you want changes, just tell Claude:${NC}"
echo '"Add feature X" and I will:'
echo "1. Code the feature locally"
echo "2. Commit the changes"
echo "3. Push to GitHub"
echo "4. Auto-deploy to EC2"
echo "5. Update CLAUDE.md with the changes"