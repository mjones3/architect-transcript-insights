#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Deploying Application to EC2 ===${NC}"

# Variables
EC2_IP="54.89.55.82"
EC2_USER="ec2-user"
KEY_PATH="~/melvin-jones.com-pair.pem"  # Update this path to your key file
APP_NAME="architect-transcript-insights"
S3_BUCKET="architect-transcripts-294417223953-prod"
ALB_DNS="architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com"

# Create deployment package
echo -e "${YELLOW}Creating deployment package...${NC}"

# Create temporary deployment directory
DEPLOY_DIR="deployment-package"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy essential files
cp -r src server public package-deploy.json tsconfig*.json vite.config.ts postcss.config.js tailwind.config.js $DEPLOY_DIR/ 2>/dev/null || true
mv $DEPLOY_DIR/package-deploy.json $DEPLOY_DIR/package.json

# Create deployment archive
tar -czf app-deploy.tar.gz -C $DEPLOY_DIR .
echo -e "${GREEN}✓ Deployment package created${NC}"

# Upload to S3
echo -e "${YELLOW}Uploading to S3...${NC}"
aws s3 cp app-deploy.tar.gz s3://$S3_BUCKET/deployments/app-deploy.tar.gz
echo -e "${GREEN}✓ Uploaded to S3${NC}"

# Create deployment script for EC2
cat > remote-deploy.sh << 'EOF'
#!/bin/bash
set -e

# Variables
APP_HOME="/opt/architect-transcript-insights"
S3_BUCKET="architect-transcripts-294417223953-prod"
AWS_REGION="us-east-1"

echo "=== Starting deployment on EC2 ==="

# Stop existing services
echo "Stopping existing services..."
sudo pm2 delete all 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true

# Create app directory if not exists
sudo mkdir -p $APP_HOME
cd $APP_HOME

# Download and extract application
echo "Downloading application from S3..."
aws s3 cp s3://$S3_BUCKET/deployments/app-deploy.tar.gz /tmp/app-deploy.tar.gz

echo "Extracting application..."
sudo rm -rf $APP_HOME/*
sudo tar -xzf /tmp/app-deploy.tar.gz -C $APP_HOME

# Install dependencies
echo "Installing dependencies..."
sudo npm install --production

# Build the application
echo "Building application..."
sudo npm run build || echo "Build step skipped"

# Create environment file
echo "Creating environment configuration..."
sudo tee $APP_HOME/.env > /dev/null << ENVFILE
# AWS Configuration
AWS_REGION=us-east-1
S3_BUCKET_NAME=architect-transcripts-294417223953-prod

# Application Configuration  
NODE_ENV=production
PORT=3001
VITE_API_BASE_URL=http://architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com/api

# Cognito Configuration (from Terraform)
COGNITO_USER_POOL_ID=us-east-1_SomePoolId
COGNITO_CLIENT_ID=SomeClientId

# Add your actual API keys here:
# ANTHROPIC_API_KEY=your-key-here
# CLAUDE_PROJECT_IDS=proj_xxx,proj_yyy
ENVFILE

# Set permissions
sudo chown -R ec2-user:ec2-user $APP_HOME
sudo chmod 600 $APP_HOME/.env

# Configure PM2 ecosystem
echo "Creating PM2 configuration..."
cat > $APP_HOME/ecosystem.config.js << 'PM2EOF'
module.exports = {
  apps: [
    {
      name: 'transcript-api',
      script: './server/index.js',
      cwd: '/opt/architect-transcript-insights',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'transcript-frontend',
      script: 'npm',
      args: 'run preview',
      cwd: '/opt/architect-transcript-insights',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
PM2EOF

# Configure nginx
echo "Configuring nginx..."
sudo tee /etc/nginx/conf.d/app.conf > /dev/null << 'NGINXCONF'
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:3001/health;
    }
}
NGINXCONF

# Remove default nginx config if exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Start services
echo "Starting services..."
sudo systemctl restart nginx

# Start PM2 apps
cd $APP_HOME
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u ec2-user --hp /home/ec2-user

echo "=== Deployment completed successfully ==="
echo "Application should be available at the load balancer soon"
EOF

# Execute deployment via SSM
echo -e "${YELLOW}Executing deployment on EC2...${NC}"

# Try SSM first
INSTANCE_ID="i-021318587cae1ac80"
aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[\"$(cat remote-deploy.sh | sed 's/"/\\"/g')\"]" \
    --region us-east-1 \
    --output text \
    --query 'Command.CommandId' > command-id.txt 2>/dev/null || {
    echo -e "${YELLOW}SSM not available, please SSH and run the deployment manually${NC}"
    echo -e "${YELLOW}SSH command: ssh -i $KEY_PATH $EC2_USER@$EC2_IP${NC}"
    echo -e "${YELLOW}Then run: bash -s < remote-deploy.sh${NC}"
    exit 1
}

if [ -f command-id.txt ]; then
    COMMAND_ID=$(cat command-id.txt)
    echo -e "${YELLOW}Waiting for deployment (Command ID: $COMMAND_ID)...${NC}"
    
    # Wait for command to complete
    sleep 10
    
    # Get command status
    aws ssm get-command-invocation \
        --command-id $COMMAND_ID \
        --instance-id $INSTANCE_ID \
        --region us-east-1 \
        --query 'Status' \
        --output text
    
    # Get command output
    echo -e "${YELLOW}Command output:${NC}"
    aws ssm get-command-invocation \
        --command-id $COMMAND_ID \
        --instance-id $INSTANCE_ID \
        --region us-east-1 \
        --query 'StandardOutputContent' \
        --output text | head -50
fi

# Clean up
rm -rf $DEPLOY_DIR app-deploy.tar.gz remote-deploy.sh command-id.txt

echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "${GREEN}Load Balancer URL: http://${ALB_DNS}${NC}"
echo -e "${GREEN}EC2 Instance: $EC2_IP${NC}"
echo ""
echo -e "${YELLOW}Test the application:${NC}"
echo "curl -I http://${ALB_DNS}"
echo ""
echo -e "${YELLOW}To check logs on EC2:${NC}"
echo "ssh -i $KEY_PATH $EC2_USER@$EC2_IP"
echo "pm2 logs"