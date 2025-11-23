#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== GitHub Repository Setup ===${NC}"
echo "This will help you set up GitHub for automated deployments"

# Get GitHub username
echo -e "\n${YELLOW}Step 1: Enter your GitHub username${NC}"
read -p "GitHub username: " GITHUB_USER

if [ -z "$GITHUB_USER" ]; then
    echo -e "${RED}Username required!${NC}"
    exit 1
fi

# Ask for repository name
echo -e "\n${YELLOW}Step 2: Repository name${NC}"
read -p "Repository name [architect-transcript-insights]: " REPO_NAME
REPO_NAME=${REPO_NAME:-architect-transcript-insights}

# Choose connection method
echo -e "\n${YELLOW}Step 3: Choose connection method${NC}"
echo "1) HTTPS (easier, works everywhere)"
echo "2) SSH (more secure, requires SSH key setup)"
read -p "Choose (1 or 2) [1]: " CONNECTION_METHOD
CONNECTION_METHOD=${CONNECTION_METHOD:-1}

# Add remote
echo -e "\n${YELLOW}Adding GitHub remote...${NC}"
if [ "$CONNECTION_METHOD" = "2" ]; then
    git remote add origin git@github.com:${GITHUB_USER}/${REPO_NAME}.git
    echo -e "${GREEN}✓ Added SSH remote${NC}"
else
    git remote add origin https://github.com/${GITHUB_USER}/${REPO_NAME}.git
    echo -e "${GREEN}✓ Added HTTPS remote${NC}"
fi

echo -e "\n${YELLOW}Step 4: Create the repository on GitHub${NC}"
echo -e "${BLUE}Go to: https://github.com/new${NC}"
echo "- Repository name: ${REPO_NAME}"
echo "- Make it Public or Private"
echo "- DON'T initialize with README (we already have one)"
echo ""
read -p "Press Enter when you've created the repository on GitHub..."

echo -e "\n${YELLOW}Step 5: Push code to GitHub${NC}"
echo "Pushing your code..."
git branch -M main
git push -u origin main || {
    echo -e "${YELLOW}If push failed, you may need to:${NC}"
    echo "1. Make sure you created the repository on GitHub"
    echo "2. If using HTTPS, enter your GitHub username and Personal Access Token"
    echo "3. If using SSH, make sure your SSH key is added to GitHub"
    echo ""
    echo "To create a Personal Access Token:"
    echo "Go to: https://github.com/settings/tokens/new"
    echo "- Note: 'Deploy Token'"
    echo "- Expiration: 90 days"
    echo "- Scopes: Check 'repo' (full control)"
    echo ""
    read -p "Try pushing again? (y/n): " RETRY
    if [ "$RETRY" = "y" ]; then
        git push -u origin main
    fi
}

echo -e "\n${GREEN}=== Repository Created! ===${NC}"
echo ""
echo -e "${YELLOW}Step 6: Add GitHub Secrets${NC}"
echo -e "${BLUE}Go to: https://github.com/${GITHUB_USER}/${REPO_NAME}/settings/secrets/actions${NC}"
echo ""
echo "Add these 3 secrets:"
echo ""
echo -e "${YELLOW}1. AWS_ACCESS_KEY_ID${NC}"
echo "   Your AWS Access Key ID"
echo ""
echo -e "${YELLOW}2. AWS_SECRET_ACCESS_KEY${NC}"
echo "   Your AWS Secret Access Key"
echo ""
echo -e "${YELLOW}3. EC2_PRIVATE_KEY${NC}"
echo "   Contents of: ~/Downloads/melvin-jones.com-pair.pem"
echo "   Include everything from -----BEGIN to -----END-----"
echo ""
echo -e "${GREEN}After adding secrets, your CI/CD pipeline is active!${NC}"
echo ""
echo -e "${YELLOW}Monitor deployments at:${NC}"
echo "https://github.com/${GITHUB_USER}/${REPO_NAME}/actions"
echo ""
echo -e "${YELLOW}Your application URL:${NC}"
echo "http://architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com"
echo ""
echo -e "${GREEN}✅ Setup complete! Now every 'git push' will auto-deploy to EC2!${NC}"

# Save configuration
echo -e "\n${YELLOW}Saving configuration...${NC}"
cat >> CLAUDE.md << EOF

## GitHub Configuration
- **Repository**: https://github.com/${GITHUB_USER}/${REPO_NAME}
- **Actions**: https://github.com/${GITHUB_USER}/${REPO_NAME}/actions
- **Connection**: $([ "$CONNECTION_METHOD" = "2" ] && echo "SSH" || echo "HTTPS")
- **Setup Date**: $(date +%Y-%m-%d)
EOF

git add CLAUDE.md
git commit -m "docs: Add GitHub repository configuration" || true
git push || true

echo -e "${GREEN}Configuration saved to CLAUDE.md${NC}"