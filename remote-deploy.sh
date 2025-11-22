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
