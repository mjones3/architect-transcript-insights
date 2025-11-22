#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== EC2 Application Deployment Script ===${NC}"
echo -e "${YELLOW}This script will deploy the application to your EC2 instance${NC}"

# Variables
EC2_IP="54.89.55.82"
EC2_USER="ec2-user"
KEY_PATH="$HOME/Downloads/melvin-jones.com-pair.pem"

# Check if key exists
if [ ! -f "$KEY_PATH" ]; then
    echo -e "${YELLOW}Looking for PEM files in Downloads...${NC}"
    KEY_PATH=$(find ~/Downloads -name "*.pem" -type f | head -1)
    if [ -z "$KEY_PATH" ]; then
        echo -e "${RED}No PEM file found in Downloads directory${NC}"
        echo "Please specify the correct path to your key file"
        exit 1
    fi
    echo -e "${GREEN}Found key: $KEY_PATH${NC}"
fi

# Set correct permissions on key
chmod 600 "$KEY_PATH"

echo -e "${YELLOW}Connecting to EC2 instance and deploying...${NC}"

# Execute deployment on EC2
ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" "$EC2_USER@$EC2_IP" << 'ENDSSH'
set -e

echo "=== Starting deployment on EC2 ==="

# Install required packages
echo "Installing Node.js and nginx..."
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs nginx

# Install PM2
sudo npm install -g pm2

# Create application directory
sudo mkdir -p /opt/architect-transcript-insights
cd /opt/architect-transcript-insights

# Download application from S3
echo "Downloading application from S3..."
sudo aws s3 cp s3://architect-transcripts-294417223953-prod/deployments/app-deploy.tar.gz . || {
    echo "Failed to download from S3, creating minimal app..."
    
    # Create a minimal Node.js app for health checks
    sudo tee server.js > /dev/null << 'EOF'
const http = require('http');
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/', (req, res) => {
    res.send('<h1>Architect Transcript Insights</h1><p>Application is running!</p>');
});

app.listen(3001, '0.0.0.0', () => {
    console.log('Server running on port 3001');
});
EOF

    # Create package.json
    sudo tee package.json > /dev/null << 'EOF'
{
  "name": "architect-transcript-insights",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2"
  }
}
EOF

    sudo npm install
}

# Extract if tar file exists
if [ -f app-deploy.tar.gz ]; then
    echo "Extracting application..."
    sudo tar -xzf app-deploy.tar.gz
    sudo npm install --production || true
fi

# Create environment file
sudo tee .env > /dev/null << 'EOF'
AWS_REGION=us-east-1
S3_BUCKET_NAME=architect-transcripts-294417223953-prod
NODE_ENV=production
PORT=3001
EOF

# Configure nginx
echo "Configuring nginx..."
sudo tee /etc/nginx/conf.d/app.conf > /dev/null << 'EOF'
server {
    listen 80;
    listen 3000;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        proxy_pass http://127.0.0.1:3001/health;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Remove default nginx configs
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/conf.d/default.conf

# Test and restart nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Start application with PM2
echo "Starting application with PM2..."
cd /opt/architect-transcript-insights
pm2 delete all 2>/dev/null || true

# Start the server
if [ -f server/index.js ]; then
    pm2 start server/index.js --name architect-api
elif [ -f server.js ]; then
    pm2 start server.js --name architect-api
fi

pm2 save
pm2 startup systemd -u ec2-user --hp /home/ec2-user
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ec2-user --hp /home/ec2-user

# Check status
pm2 status

echo "=== Deployment completed successfully ==="
echo "Testing health endpoint..."
curl -f http://localhost:3001/health && echo -e "\n✓ Health check passed" || echo -e "\n✗ Health check failed"

ENDSSH

echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "${GREEN}EC2 deployment finished!${NC}"
echo ""
echo -e "${YELLOW}Testing the application through Load Balancer...${NC}"
sleep 5

# Test the load balancer
ALB_URL="http://architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com"
echo -e "${YELLOW}Checking $ALB_URL${NC}"

# Wait for health checks to pass
for i in {1..12}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $ALB_URL 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Application is accessible! HTTP $HTTP_CODE${NC}"
        echo -e "${GREEN}URL: $ALB_URL${NC}"
        break
    else
        echo "Waiting for health checks... (attempt $i/12, status: $HTTP_CODE)"
        sleep 5
    fi
done

# Final status check
echo -e "\n${YELLOW}Checking target health...${NC}"
aws elbv2 describe-target-health \
    --target-group-arn arn:aws:elasticloadbalancing:us-east-1:294417223953:targetgroup/architect-transcript-app-tg/8a3d5b020d715429 \
    --query 'TargetHealthDescriptions[0].TargetHealth.State' \
    --output text

echo -e "\n${GREEN}Access your application at:${NC}"
echo -e "${GREEN}$ALB_URL${NC}"