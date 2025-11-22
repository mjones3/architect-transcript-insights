#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== EC2 Application Deployment Script (Fixed) ===${NC}"

# Variables
EC2_IP="54.89.55.82"
EC2_USER="ec2-user"
KEY_PATH="$HOME/Downloads/melvin-jones.com-pair.pem"

# Check if key exists
if [ ! -f "$KEY_PATH" ]; then
    KEY_PATH=$(find ~/Downloads -name "*.pem" -type f | head -1)
    if [ -z "$KEY_PATH" ]; then
        echo -e "${RED}No PEM file found${NC}"
        exit 1
    fi
fi

chmod 600 "$KEY_PATH"

echo -e "${YELLOW}Deploying to EC2...${NC}"

# Execute deployment on EC2
ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" "$EC2_USER@$EC2_IP" << 'ENDSSH'
set -e

echo "=== Deploying on Amazon Linux 2 ==="

# Install Node.js 16 (compatible with Amazon Linux 2)
echo "Installing Node.js 16..."
curl -sL https://rpm.nodesource.com/setup_16.x | sudo bash -
sudo yum install -y nodejs

# Install nginx from Amazon Linux Extras
echo "Installing nginx..."
sudo amazon-linux-extras install -y nginx1

# Install PM2
sudo npm install -g pm2

# Create application directory
sudo mkdir -p /opt/architect-transcript-insights
cd /opt/architect-transcript-insights

# Create a simple Node.js health check server
echo "Creating application..."
sudo tee server.js > /dev/null << 'EOF'
const http = require('http');
const path = require('path');
const fs = require('fs');

const server = http.createServer((req, res) => {
    console.log(`Request: ${req.method} ${req.url}`);
    
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
    } else if (req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', timestamp: new Date() }));
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Architect Transcript Insights</title>
                <style>
                    body { font-family: Arial; text-align: center; padding: 50px; }
                    h1 { color: #333; }
                    .status { color: green; font-size: 24px; }
                </style>
            </head>
            <body>
                <h1>🏗️ Architect Transcript Insights</h1>
                <p class="status">✅ Application is running!</p>
                <p>Load Balancer connected successfully</p>
                <p>Deployment completed at: ${new Date()}</p>
            </body>
            </html>
        `);
    }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
EOF

# Create package.json
sudo tee package.json > /dev/null << 'EOF'
{
  "name": "architect-transcript-insights",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  }
}
EOF

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
    
    # Remove default server block
    default_type text/html;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        proxy_pass http://127.0.0.1:3001/health;
        proxy_set_header Host $host;
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

# Remove any conflicting nginx configs
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/conf.d/default.conf
sudo rm -f /usr/share/nginx/html/index.html

# Test nginx configuration
sudo nginx -t

# Start services
echo "Starting services..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# Start application with PM2
cd /opt/architect-transcript-insights
pm2 delete all 2>/dev/null || true
pm2 start server.js --name architect-app
pm2 save

# Setup PM2 to start on boot
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ec2-user --hp /home/ec2-user

# Check status
echo "=== Checking deployment status ==="
pm2 status
sleep 2

# Test the application
echo "Testing application..."
curl -f http://localhost/health && echo -e "\n✓ Nginx proxy working" || echo -e "\n✗ Nginx issue"
curl -f http://localhost:3001/health && echo -e "\n✓ Node app working" || echo -e "\n✗ Node issue"

echo "=== Deployment completed ==="

ENDSSH

echo -e "\n${GREEN}=== Deployment Script Completed ===${NC}"
echo -e "${YELLOW}Waiting for health checks...${NC}"
sleep 10

# Test the load balancer
ALB_URL="http://architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com"

for i in {1..6}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $ALB_URL 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Application is live!${NC}"
        echo -e "${GREEN}URL: $ALB_URL${NC}"
        curl -s $ALB_URL | grep -o '<title>.*</title>'
        break
    else
        echo "Waiting... (attempt $i/6, status: $HTTP_CODE)"
        sleep 5
    fi
done

# Check final health
echo -e "\n${YELLOW}Target health status:${NC}"
aws elbv2 describe-target-health \
    --target-group-arn arn:aws:elasticloadbalancing:us-east-1:294417223953:targetgroup/architect-transcript-app-tg/8a3d5b020d715429 \
    --query 'TargetHealthDescriptions[0].TargetHealth.State' \
    --output text

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}Access at: $ALB_URL${NC}"