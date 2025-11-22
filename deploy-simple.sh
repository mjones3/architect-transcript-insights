#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'  
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Simple EC2 Deployment ===${NC}"

# Variables
EC2_IP="54.89.55.82"
EC2_USER="ec2-user"
KEY_PATH="$HOME/Downloads/melvin-jones.com-pair.pem"

# Find key
if [ ! -f "$KEY_PATH" ]; then
    KEY_PATH=$(find ~/Downloads -name "*.pem" -type f | head -1)
fi
chmod 600 "$KEY_PATH"

echo -e "${YELLOW}Deploying minimal app to EC2...${NC}"

# Deploy
ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" "$EC2_USER@$EC2_IP" << 'ENDSSH'
echo "=== Quick deployment ==="

# Use system Node.js or install from Amazon Linux repo
if ! command -v node &> /dev/null; then
    echo "Installing Node.js from Amazon Linux extras..."
    sudo yum install -y gcc-c++ make
    curl -sL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    source ~/.nvm/nvm.sh
    nvm install 16
    nvm use 16
fi

# Install nginx from Amazon Linux Extras
sudo amazon-linux-extras install -y nginx1.12

# Create simple app
sudo mkdir -p /opt/app
cd /opt/app

# Create minimal server
sudo tee server.js > /dev/null << 'EOF'
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end('<h1>Architect Transcript Insights</h1><p>Load Balancer Connected!</p>');
}).listen(3001, '0.0.0.0');
console.log('Server running on port 3001');
EOF

# Configure nginx
sudo tee /etc/nginx/nginx.conf > /dev/null << 'EOF'
events { worker_connections 1024; }
http {
    server {
        listen 80;
        listen 3000;
        location / { 
            proxy_pass http://127.0.0.1:3001;
            proxy_set_header Host $host;
        }
    }
}
EOF

# Start services
sudo killall node 2>/dev/null || true
sudo systemctl restart nginx
cd /opt/app && nohup node server.js > /dev/null 2>&1 &

sleep 2
echo "Testing..."
curl -s http://localhost:80 | head -1
echo "Deployment complete!"
ENDSSH

echo -e "\n${GREEN}Checking Load Balancer...${NC}"
sleep 5

# Test
ALB_URL="http://architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $ALB_URL)
echo -e "Load Balancer Status: ${HTTP_CODE}"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ SUCCESS! Application is live at:${NC}"
    echo -e "${GREEN}$ALB_URL${NC}"
else
    echo -e "${YELLOW}Application deployed, waiting for health checks...${NC}"
    echo -e "${YELLOW}Check in 30 seconds at: $ALB_URL${NC}"
fi