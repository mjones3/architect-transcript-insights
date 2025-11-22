#!/bin/bash
set -e

# Deploy Application to EC2 Instance
echo "🚀 Deploying Architect Transcript Insights to EC2"
echo "================================================="

# Configuration
EC2_IP="54.89.55.82"
KEY_PATH="~/.ssh/melvin-jones.com-pair.pem"
APP_DIR="/opt/architect-transcript-insights"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if SSH key exists
if [ ! -f ~/.ssh/melvin-jones.com-pair.pem ]; then
    print_error "SSH key not found at ~/.ssh/melvin-jones.com-pair.pem"
    print_warning "Please ensure your EC2 key pair is downloaded and placed at that location"
    exit 1
fi

# Ensure correct permissions on SSH key
chmod 400 ~/.ssh/melvin-jones.com-pair.pem

print_status "Creating application directory on EC2..."
ssh -i ~/.ssh/melvin-jones.com-pair.pem -o StrictHostKeyChecking=no ec2-user@${EC2_IP} "
    sudo mkdir -p ${APP_DIR}
    sudo chown ec2-user:ec2-user ${APP_DIR}
"

print_status "Copying application files to EC2..."
scp -i ~/.ssh/melvin-jones.com-pair.pem -o StrictHostKeyChecking=no -r . ec2-user@${EC2_IP}:${APP_DIR}/

print_status "Installing and starting application on EC2..."
ssh -i ~/.ssh/melvin-jones.com-pair.pem -o StrictHostKeyChecking=no ec2-user@${EC2_IP} "
    cd ${APP_DIR}
    
    # Install Node.js if not present
    if ! command -v node &> /dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    fi
    
    # Install dependencies
    npm install
    
    # Build the application
    npm run build
    
    # Install PM2 if not present
    if ! command -v pm2 &> /dev/null; then
        sudo npm install -g pm2
    fi
    
    # Start the application
    pm2 delete all || true
    pm2 start server/index.ts --name 'architect-transcript-api' --interpreter node
    pm2 serve dist 3000 --name 'architect-transcript-frontend' --spa
    pm2 save
    pm2 startup systemd -u ec2-user --hp /home/ec2-user
    
    # Configure nginx if present
    if command -v nginx &> /dev/null; then
        sudo tee /etc/nginx/conf.d/architect-transcript.conf > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }
    
    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass \\\$http_upgrade;
    }
}
EOF
        sudo nginx -t && sudo systemctl reload nginx
    fi
"

print_status "Checking application status..."
ssh -i ~/.ssh/melvin-jones.com-pair.pem -o StrictHostKeyChecking=no ec2-user@${EC2_IP} "pm2 list"

print_status "✅ Application deployed successfully!"
echo ""
print_warning "Access your application at:"
echo "🌐 Load Balancer: http://architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com"
echo "🌐 Direct IP: http://${EC2_IP}"
echo "🌐 Domain (once DNS propagates): http://insights.melvin-jones.com"
echo ""
print_status "Your Claude Projects are configured and ready!"
print_warning "Don't forget to add your Anthropic API key to the .env file on the server if needed."