#!/bin/bash
set -e

# Iterative Deployment Script - For continuous improvements
# This script allows you to deploy changes quickly from local to EC2

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Architect Transcript Insights - Iterative Deployment ===${NC}"
echo -e "${YELLOW}This script deploys your local changes to the EC2 instance${NC}"

# Configuration
EC2_IP="54.89.55.82"
EC2_USER="ec2-user"
KEY_PATH="$HOME/Downloads/melvin-jones.com-pair.pem"
S3_BUCKET="architect-transcripts-294417223953-prod"
APP_NAME="architect-transcript-insights"
DEPLOY_ID=$(date +%Y%m%d-%H%M%S)

# Find SSH key
if [ ! -f "$KEY_PATH" ]; then
    echo -e "${YELLOW}Looking for SSH key...${NC}"
    KEY_PATH=$(find ~/Downloads -name "*.pem" -type f | head -1)
    if [ -z "$KEY_PATH" ]; then
        echo -e "${RED}No PEM file found in Downloads${NC}"
        exit 1
    fi
fi
chmod 600 "$KEY_PATH"

# Check what to deploy
echo -e "\n${YELLOW}What would you like to deploy?${NC}"
echo "1) Frontend only (React app)"
echo "2) Backend only (API server)"
echo "3) Both frontend and backend"
echo "4) Configuration files only (.env, nginx)"
echo "5) Quick hotfix (single file)"
read -p "Choose option (1-5): " DEPLOY_OPTION

# Build application locally
if [ "$DEPLOY_OPTION" != "4" ] && [ "$DEPLOY_OPTION" != "5" ]; then
    echo -e "\n${YELLOW}Building application locally...${NC}"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Build frontend if deploying frontend
    if [ "$DEPLOY_OPTION" = "1" ] || [ "$DEPLOY_OPTION" = "3" ]; then
        echo "Building frontend..."
        npm run build || echo "Build step skipped"
    fi
fi

# Create deployment package
echo -e "\n${YELLOW}Creating deployment package...${NC}"
DEPLOY_DIR="deploy-$DEPLOY_ID"
mkdir -p $DEPLOY_DIR

case $DEPLOY_OPTION in
    1)
        echo "Packaging frontend..."
        cp -r dist/* $DEPLOY_DIR/ 2>/dev/null || cp -r build/* $DEPLOY_DIR/ 2>/dev/null || echo "No build directory found"
        cp -r public/* $DEPLOY_DIR/ 2>/dev/null || true
        ;;
    2)
        echo "Packaging backend..."
        cp -r server $DEPLOY_DIR/
        cp package*.json $DEPLOY_DIR/
        ;;
    3)
        echo "Packaging full application..."
        cp -r server src public package*.json tsconfig*.json vite.config.ts $DEPLOY_DIR/ 2>/dev/null || true
        cp -r dist $DEPLOY_DIR/ 2>/dev/null || cp -r build $DEPLOY_DIR/ 2>/dev/null || true
        ;;
    4)
        echo "Packaging configuration..."
        cp .env* nginx.conf $DEPLOY_DIR/ 2>/dev/null || true
        ;;
    5)
        read -p "Enter file path to deploy: " FILE_PATH
        cp $FILE_PATH $DEPLOY_DIR/
        ;;
esac

# Create deployment archive
tar -czf deploy-$DEPLOY_ID.tar.gz -C $DEPLOY_DIR .
echo -e "${GREEN}✓ Package created: deploy-$DEPLOY_ID.tar.gz${NC}"

# Upload to S3
echo -e "\n${YELLOW}Uploading to S3...${NC}"
aws s3 cp deploy-$DEPLOY_ID.tar.gz s3://$S3_BUCKET/deployments/

# Deploy to EC2
echo -e "\n${YELLOW}Deploying to EC2...${NC}"
ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" "$EC2_USER@$EC2_IP" << ENDSSH
set -e
echo "=== Starting deployment $DEPLOY_ID ==="

# Create backup
BACKUP_DIR="/opt/backups/\$(date +%Y%m%d-%H%M%S)"
sudo mkdir -p \$BACKUP_DIR
sudo cp -r /opt/$APP_NAME \$BACKUP_DIR/ 2>/dev/null || true

# Download new deployment
cd /tmp
aws s3 cp s3://$S3_BUCKET/deployments/deploy-$DEPLOY_ID.tar.gz .

# Extract to app directory
sudo mkdir -p /opt/$APP_NAME
cd /opt/$APP_NAME
sudo tar -xzf /tmp/deploy-$DEPLOY_ID.tar.gz

# Install/update dependencies if package.json exists
if [ -f package.json ]; then
    echo "Installing dependencies..."
    sudo npm install --production || true
fi

# Restart services based on what was deployed
case $DEPLOY_OPTION in
    1)
        echo "Frontend deployed - no restart needed"
        ;;
    2|3)
        echo "Restarting backend services..."
        pm2 restart all || pm2 start server/index.js --name api
        ;;
    4)
        echo "Reloading nginx configuration..."
        sudo nginx -t && sudo systemctl reload nginx
        pm2 restart all
        ;;
esac

# Cleanup
rm /tmp/deploy-$DEPLOY_ID.tar.gz

echo "=== Deployment $DEPLOY_ID complete ==="
pm2 status
ENDSSH

# Cleanup local files
rm -rf $DEPLOY_DIR deploy-$DEPLOY_ID.tar.gz

# Test deployment
echo -e "\n${YELLOW}Testing deployment...${NC}"
sleep 3
ALB_URL="http://architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $ALB_URL)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Deployment successful! Application responding with HTTP $HTTP_CODE${NC}"
else
    echo -e "${YELLOW}⚠️  Application returned HTTP $HTTP_CODE - may need more time${NC}"
fi

echo -e "\n${GREEN}Deployment complete!${NC}"
echo -e "View application: ${BLUE}$ALB_URL${NC}"
echo -e "View logs: ssh -i $KEY_PATH $EC2_USER@$EC2_IP 'pm2 logs'"

# Update CLAUDE.md with deployment
echo -e "\n## Deployment History\n- $(date): Deployed $DEPLOY_OPTION (ID: $DEPLOY_ID)" >> CLAUDE.md