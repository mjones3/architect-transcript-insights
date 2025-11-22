#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Architect Transcript Insights AWS Deployment ===${NC}"
echo "This script will deploy the full application to AWS with Load Balancer"

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check Terraform
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Terraform is not installed. Please install it first.${NC}"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install it first.${NC}"
    exit 1
fi

# Test AWS credentials
echo -e "${YELLOW}Testing AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS credentials not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")
echo -e "${GREEN}✓ AWS Account: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${GREEN}✓ AWS Region: ${AWS_REGION}${NC}"

# Build the application
echo -e "\n${YELLOW}Building the application...${NC}"
npm install
npm run build || echo "Build script not found, skipping..."

# Create deployment package
echo -e "\n${YELLOW}Creating deployment package...${NC}"
DEPLOY_DIR="deployment-package"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy application files
cp -r src server public package*.json tsconfig*.json vite.config.ts postcss.config.js tailwind.config.js $DEPLOY_DIR/ 2>/dev/null || true

# Create a production-ready package.json
cat > $DEPLOY_DIR/package.json << 'EOF'
{
  "name": "architect-transcript-insights",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview --port 3000 --host 0.0.0.0",
    "server": "tsx server/index.ts",
    "start": "concurrently \"npm run server\" \"npm run preview\""
  },
  "dependencies": {
    "@aws-sdk/client-bedrock-runtime": "^3.485.0",
    "@aws-sdk/client-cognito-identity-provider": "^3.485.0",
    "@aws-sdk/client-s3": "^3.485.0",
    "@aws-sdk/client-transcribe-streaming": "^3.485.0",
    "@aws-sdk/lib-storage": "^3.485.0",
    "@tanstack/react-query": "^5.17.1",
    "anthropic": "^0.17.0",
    "axios": "^1.6.5",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "lucide-react": "^0.303.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-markdown": "^9.0.1",
    "socket.io": "^4.6.1",
    "socket.io-client": "^4.6.1",
    "ws": "^8.16.0",
    "concurrently": "^8.2.2",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.8"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.6",
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@types/ws": "^8.5.10",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0"
  }
}
EOF

# Create tarball for deployment
echo -e "${YELLOW}Creating deployment tarball...${NC}"
tar -czf architect-transcript-app.tar.gz -C $DEPLOY_DIR .
echo -e "${GREEN}✓ Deployment package created: architect-transcript-app.tar.gz${NC}"

# Deploy infrastructure with Terraform
echo -e "\n${YELLOW}Deploying infrastructure with Terraform...${NC}"
cd terraform

# Initialize Terraform
echo -e "${YELLOW}Initializing Terraform...${NC}"
terraform init

# Plan the deployment
echo -e "${YELLOW}Planning Terraform deployment...${NC}"
terraform plan -out=tfplan

# Ask for confirmation
echo -e "\n${YELLOW}Review the plan above. Do you want to apply these changes? (yes/no)${NC}"
read -r response
if [[ "$response" != "yes" ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 1
fi

# Apply Terraform
echo -e "${YELLOW}Applying Terraform configuration...${NC}"
terraform apply tfplan

# Get outputs
echo -e "\n${YELLOW}Getting deployment outputs...${NC}"
ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "")
EC2_PUBLIC_IP=$(terraform output -raw ec2_public_ip 2>/dev/null || echo "")
EC2_INSTANCE_ID=$(terraform output -raw ec2_instance_id 2>/dev/null || echo "")
COGNITO_USER_POOL_ID=$(terraform output -raw cognito_user_pool_id 2>/dev/null || echo "")
COGNITO_CLIENT_ID=$(terraform output -raw cognito_client_id 2>/dev/null || echo "")
S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")

cd ..

# Wait for instance to be ready
if [ -n "$EC2_INSTANCE_ID" ]; then
    echo -e "\n${YELLOW}Waiting for EC2 instance to be ready...${NC}"
    aws ec2 wait instance-status-ok --instance-ids $EC2_INSTANCE_ID --region $AWS_REGION
    echo -e "${GREEN}✓ EC2 instance is ready${NC}"
    
    # Upload application code to S3
    echo -e "\n${YELLOW}Uploading application to S3...${NC}"
    aws s3 cp architect-transcript-app.tar.gz s3://$S3_BUCKET/deployments/architect-transcript-app.tar.gz
    
    # Create deployment script for EC2
    cat > deploy-to-ec2-instance.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

APP_HOME="/opt/architect-transcript-insights"
APP_USER="appuser"
S3_BUCKET="BUCKET_PLACEHOLDER"
AWS_REGION="REGION_PLACEHOLDER"

echo "=== Deploying application on EC2 instance ==="

# Download application from S3
echo "Downloading application from S3..."
aws s3 cp s3://$S3_BUCKET/deployments/architect-transcript-app.tar.gz /tmp/app.tar.gz --region $AWS_REGION

# Extract application
echo "Extracting application..."
sudo mkdir -p $APP_HOME
sudo tar -xzf /tmp/app.tar.gz -C $APP_HOME

# Install dependencies
echo "Installing dependencies..."
cd $APP_HOME
sudo npm install --production

# Build the application
echo "Building application..."
sudo npm run build || true

# Update environment file
echo "Updating environment configuration..."
sudo tee $APP_HOME/.env > /dev/null << EOF
# AWS Configuration
AWS_REGION=$AWS_REGION
S3_BUCKET_NAME=$S3_BUCKET

# Application Configuration
NODE_ENV=production
PORT=3001
VITE_API_BASE_URL=http://localhost:3001

# Add your API keys here
# ANTHROPIC_API_KEY=your-key-here
# CLAUDE_PROJECT_IDS=proj_xxx,proj_yyy

# Cognito Configuration (will be added by Terraform)
EOF

# Set permissions
sudo chown -R $APP_USER:$APP_USER $APP_HOME || true
sudo chmod 600 $APP_HOME/.env

# Restart services
echo "Restarting services..."
sudo systemctl restart nginx || true
sudo pm2 delete all || true
sudo -u $APP_USER pm2 start $APP_HOME/ecosystem.config.js --env production || true
sudo -u $APP_USER pm2 save || true

echo "=== Deployment completed ==="
DEPLOY_SCRIPT

    # Replace placeholders
    sed -i.bak "s/BUCKET_PLACEHOLDER/$S3_BUCKET/g" deploy-to-ec2-instance.sh
    sed -i.bak "s/REGION_PLACEHOLDER/$AWS_REGION/g" deploy-to-ec2-instance.sh
    
    # Execute deployment on EC2
    echo -e "\n${YELLOW}Deploying application to EC2 instance...${NC}"
    aws ssm send-command \
        --instance-ids $EC2_INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=["$(cat deploy-to-ec2-instance.sh)"]' \
        --region $AWS_REGION \
        --output text \
        --query 'Command.CommandId' > command-id.txt || {
        echo -e "${YELLOW}SSM not available, trying direct SSH deployment...${NC}"
        # Alternative: Use SSH if SSM is not available
        if [ -n "$EC2_PUBLIC_IP" ]; then
            echo "You can manually deploy by SSHing to: ec2-user@$EC2_PUBLIC_IP"
            echo "Then run the deployment script manually."
        fi
    }
    
    if [ -f command-id.txt ]; then
        COMMAND_ID=$(cat command-id.txt)
        echo -e "${YELLOW}Waiting for deployment to complete (Command ID: $COMMAND_ID)...${NC}"
        aws ssm wait command-executed --command-id $COMMAND_ID --instance-id $EC2_INSTANCE_ID --region $AWS_REGION
        
        # Get command output
        aws ssm get-command-invocation \
            --command-id $COMMAND_ID \
            --instance-id $EC2_INSTANCE_ID \
            --region $AWS_REGION \
            --query 'StandardOutputContent' \
            --output text
    fi
fi

# Output summary
echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "${GREEN}Application Load Balancer DNS: ${ALB_DNS}${NC}"
echo -e "${GREEN}EC2 Instance IP: ${EC2_PUBLIC_IP}${NC}"
echo -e "${GREEN}S3 Bucket: ${S3_BUCKET}${NC}"
echo -e "${GREEN}Cognito User Pool ID: ${COGNITO_USER_POOL_ID}${NC}"
echo -e "${GREEN}Cognito Client ID: ${COGNITO_CLIENT_ID}${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Add your API keys to the .env file on the EC2 instance"
echo "2. Access the application at: http://${ALB_DNS}"
echo "3. The SSL certificate will be validated shortly for https://insights.melvin-jones.com"
echo ""
echo -e "${YELLOW}To SSH into the EC2 instance:${NC}"
echo "ssh -i your-key.pem ec2-user@${EC2_PUBLIC_IP}"
echo ""
echo -e "${YELLOW}To check application logs:${NC}"
echo "aws ssm start-session --target ${EC2_INSTANCE_ID} --region ${AWS_REGION}"
echo "sudo pm2 logs"

# Clean up
rm -rf $DEPLOY_DIR
rm -f deploy-to-ec2-instance.sh deploy-to-ec2-instance.sh.bak command-id.txt architect-transcript-app.tar.gz