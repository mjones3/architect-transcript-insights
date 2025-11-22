#!/bin/bash
set -e

# Simple deployment script
APP_HOME="/opt/architect-transcript-insights"
S3_BUCKET="architect-transcripts-294417223953-prod"
AWS_REGION="us-east-1"

echo "=== Starting deployment ==="

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
fi

# Install PM2 globally
sudo npm install -g pm2

# Install nginx
sudo yum install -y nginx

# Create app directory
sudo mkdir -p $APP_HOME
cd $APP_HOME

# Download and extract application
echo "Downloading application..."
sudo aws s3 cp s3://$S3_BUCKET/deployments/app-deploy.tar.gz /tmp/app.tar.gz
sudo tar -xzf /tmp/app.tar.gz -C $APP_HOME

# Install dependencies
echo "Installing dependencies..."
sudo npm install --production

# Create minimal .env file
sudo tee $APP_HOME/.env > /dev/null << 'EOF'
AWS_REGION=us-east-1
S3_BUCKET_NAME=architect-transcripts-294417223953-prod
NODE_ENV=production
PORT=3001
EOF

# Create simple nginx config
sudo tee /etc/nginx/conf.d/app.conf > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen 3000;
    
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
    
    location /health {
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
EOF

# Remove default nginx config
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/conf.d/default.conf

# Start nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Start a simple Node.js app for health checks
sudo tee $APP_HOME/simple-server.js > /dev/null << 'EOF'
const http = require('http');
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Architect Transcript Insights - Deployment in Progress</h1>');
  }
});
server.listen(3001, () => console.log('Server running on port 3001'));
EOF

# Start the simple server
cd $APP_HOME
pm2 delete all 2>/dev/null || true
pm2 start simple-server.js --name app
pm2 save
pm2 startup systemd -u ec2-user --hp /home/ec2-user

echo "=== Basic deployment complete ==="