# 🚀 EC2 Deployment Guide - Architect Transcript Insights

Complete guide for deploying the Architect Transcript Insights application on AWS EC2 with custom domain `insights.melvin-jones.com`.

## 📋 Prerequisites

### 1. AWS Account Setup
- AWS CLI configured with appropriate permissions
- Existing VPC with public subnets in multiple AZs
- EC2 Key Pair created for SSH access
- Domain `melvin-jones.com` registered and hosted zone in Route 53

### 2. Local Development Environment
- Terraform >= 1.0 installed
- Node.js 18+ and npm
- Git for version control

### 3. Required AWS Permissions
Your AWS user/role needs permissions for:
- EC2 (instances, security groups, key pairs)
- Application Load Balancer
- Route 53 (DNS management)
- Certificate Manager (SSL certificates)
- S3 (bucket creation and management)
- IAM (role and policy creation)
- CloudWatch (logs and metrics)
- Cognito (user pool management)

## 🏗️ Architecture Overview

```
Internet
    ↓
[Route 53] insights.melvin-jones.com
    ↓
[Application Load Balancer] (HTTPS/SSL)
    ↓
[EC2 Instance] (t3.large)
    ├─ nginx (reverse proxy)
    ├─ React Frontend (port 3000)
    └─ Express API Server (port 3001)
```

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Environment

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd architect-transcript-insights
```

2. **Create and configure terraform variables:**
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

3. **Edit `terraform.tfvars` with your actual values:**
```hcl
# =============================================================================
# YOUR ACTUAL CONFIGURATION
# =============================================================================

# AWS Configuration
aws_region = "us-east-1"
environment = "production"
app_name = "architect-transcript-insights"

# S3 Configuration - MUST BE GLOBALLY UNIQUE
bucket_name = "architect-transcripts-prod-20241121"

# EC2 Deployment
deploy_ec2 = true
instance_type = "t3.large"
key_pair_name = "my-ec2-keypair"  # Your actual key pair name

# Network Configuration - REPLACE WITH YOUR VALUES
vpc_id = "vpc-abc123def456"
public_subnet_ids = [
  "subnet-abc123def456",  # us-east-1a
  "subnet-def456abc123"   # us-east-1b
]

# Security Configuration - RESTRICT FOR PRODUCTION
ssh_allowed_ips = [
  "203.0.113.0/24"  # Replace with your office/home IP
]

# Application Configuration
app_port = 3000
api_port = 3001

# Required Features
enable_cognito = true
enable_alb = true
enable_cloudwatch_agent = true
enable_ssl_redirect = true

log_retention_days = 30

tags = {
  Project = "ArchitectTranscriptInsights"
  Environment = "production"
  Owner = "YourName"
  DeployedBy = "Terraform"
  Domain = "insights.melvin-jones.com"
  DeploymentType = "EC2"
}
```

### Step 2: Create AWS Key Pair

If you don't have an EC2 key pair:

```bash
# Create new key pair
aws ec2 create-key-pair \
    --key-name architect-transcript-keypair \
    --query 'KeyMaterial' \
    --output text > ~/.ssh/architect-transcript-keypair.pem

# Set proper permissions
chmod 400 ~/.ssh/architect-transcript-keypair.pem

# Update terraform.tfvars
key_pair_name = "architect-transcript-keypair"
```

### Step 3: Get Your VPC and Subnet Information

```bash
# List VPCs
aws ec2 describe-vpcs --query 'Vpcs[*].[VpcId,CidrBlock,Tags[?Key==`Name`].Value|[0]]' --output table

# List public subnets for your VPC
aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=YOUR_VPC_ID" \
    --query 'Subnets[*].[SubnetId,AvailabilityZone,CidrBlock,MapPublicIpOnLaunch]' \
    --output table
```

### Step 4: Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Plan the deployment
terraform plan

# Apply the infrastructure
terraform apply
```

**Expected output:**
- EC2 instance with pre-configured software
- Application Load Balancer with SSL certificate
- Route 53 DNS records for `insights.melvin-jones.com`
- Cognito User Pool for authentication
- S3 bucket for transcript storage
- CloudWatch logging and monitoring

### Step 5: Deploy Application Code

Once infrastructure is created, deploy your application:

1. **Get the EC2 instance IP:**
```bash
# From Terraform output
terraform output ec2_public_ip

# Or from AWS CLI
aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=architect-transcript-insights-server-production" \
    --query 'Reservations[*].Instances[*].[InstanceId,PublicIpAddress,State.Name]' \
    --output table
```

2. **SSH to the EC2 instance:**
```bash
ssh -i ~/.ssh/architect-transcript-keypair.pem ec2-user@<EC2_PUBLIC_IP>
```

3. **Deploy application code:**
```bash
# On the EC2 instance
cd /opt/architect-transcript-insights

# Upload your application code (choose one method):

# Method A: Clone from Git repository
sudo -u appuser git clone https://github.com/yourusername/architect-transcript-insights.git .

# Method B: Copy via SCP (from your local machine)
# scp -i ~/.ssh/architect-transcript-keypair.pem -r . ec2-user@<EC2_IP>:/tmp/app/
# sudo cp -r /tmp/app/* /opt/architect-transcript-insights/
# sudo chown -R appuser:appuser /opt/architect-transcript-insights
```

4. **Configure environment variables:**
```bash
# Edit the environment file with your API keys
sudo nano /opt/architect-transcript-insights/.env
```

Add your actual configuration:
```bash
# Anthropic Claude API
ANTHROPIC_API_KEY=your-actual-api-key

# YOUR Claude Projects (from claude.ai)
CLAUDE_PROJECT_IDS=proj_your_real_id1,proj_your_real_id2

# AWS configuration (automatically set by IAM role)
AWS_REGION=us-east-1
S3_BUCKET_NAME=architect-transcripts-prod-20241121

# Cognito (will be populated from Terraform outputs)
COGNITO_USER_POOL_ID=us-east-1_abcd1234
COGNITO_CLIENT_ID=abcd1234567890

# Application
NODE_ENV=production
PORT=3001
REACT_APP_API_BASE_URL=https://insights.melvin-jones.com/api
REACT_APP_WS_BASE_URL=wss://insights.melvin-jones.com
DOMAIN_NAME=insights.melvin-jones.com

# Frontend environment
REACT_APP_COGNITO_USER_POOL_ID=us-east-1_abcd1234
REACT_APP_COGNITO_CLIENT_ID=abcd1234567890
```

5. **Run the deployment script:**
```bash
# This will install dependencies, build, and start the application
sudo /usr/local/bin/deploy-architect-transcript.sh
```

### Step 6: Verify Deployment

1. **Check services status:**
```bash
# Check systemd services
sudo systemctl status architect-transcript
sudo systemctl status nginx

# Check PM2 processes
sudo -u appuser pm2 list

# Check application logs
sudo tail -f /var/log/architect-transcript-*.log
```

2. **Test health endpoint:**
```bash
curl http://localhost/health
```

3. **Access the application:**
- Visit `https://insights.melvin-jones.com`
- Should see the login page
- Create an account and verify email

## 🔧 Post-Deployment Configuration

### 1. Configure Cognito User Pool

Get Cognito configuration from Terraform:
```bash
terraform output cognito_user_pool_id
terraform output cognito_client_id
terraform output cognito_client_secret
```

Update your `.env` file with these values.

### 2. Add Your Claude Projects

1. Go to [claude.ai](https://claude.ai)
2. Navigate to your Projects
3. Copy the Project IDs (format: `proj_xxxxxxxx`)
4. Update `.env` file:
```bash
CLAUDE_PROJECT_IDS=proj_your_real_id1,proj_your_real_id2,proj_your_real_id3
```

### 3. Set Up Monitoring

CloudWatch dashboards are automatically configured. View logs at:
- `/aws/ec2/architect-transcript-insights/application`
- `/aws/ec2/architect-transcript-insights/nginx`
- `/aws/ec2/architect-transcript-insights/user-data`

## 🔐 Security Best Practices

### 1. Restrict SSH Access
Update `terraform.tfvars`:
```hcl
ssh_allowed_ips = [
  "YOUR_OFFICE_IP/32"  # Replace with your actual IP
]
```

### 2. Enable AWS GuardDuty
```bash
aws guardduty create-detector --enable
```

### 3. Configure Backup Strategy
```bash
# Create AMI backup
aws ec2 create-image \
    --instance-id i-1234567890abcdef0 \
    --name "architect-transcript-backup-$(date +%Y%m%d)" \
    --description "Automated backup"
```

## 🚨 Troubleshooting

### Application Won't Start
```bash
# Check logs
sudo journalctl -u architect-transcript -f
sudo tail -f /var/log/user-data.log

# Restart services
sudo systemctl restart architect-transcript
sudo systemctl restart nginx
```

### SSL Certificate Issues
```bash
# Check certificate status
aws acm describe-certificate --certificate-arn $(terraform output ssl_certificate_arn)

# Check DNS propagation
nslookup insights.melvin-jones.com
dig insights.melvin-jones.com
```

### Load Balancer Health Check Failing
```bash
# Check target group health
aws elbv2 describe-target-health --target-group-arn $(terraform output app_target_group_arn)

# Test health endpoint locally
curl -v http://localhost/health
```

## 💰 Cost Optimization

### Current Configuration Costs (us-east-1)
- **t3.large EC2**: ~$67/month
- **Application Load Balancer**: ~$23/month
- **S3 storage**: ~$0.023/GB/month
- **CloudWatch logs**: ~$0.50/GB ingested
- **Route 53 hosted zone**: $0.50/month
- **Certificate Manager**: Free

**Total estimated cost: ~$90-95/month**

### Cost Reduction Options
1. **Use t3.medium**: Reduce to ~$30/month (if performance allows)
2. **Reserved Instances**: 30-60% savings with 1-3 year commitment
3. **Spot Instances**: 60-90% savings (for dev/test environments)

## 🔄 Maintenance

### Regular Tasks
```bash
# Update system packages
sudo yum update -y

# Update Node.js dependencies
cd /opt/architect-transcript-insights
sudo -u appuser npm update

# Restart application
sudo systemctl restart architect-transcript

# Clean up old logs
sudo find /var/log -name "*.log" -mtime +30 -delete
```

### Backup Strategy
1. **AMI snapshots**: Weekly automated images
2. **S3 cross-region replication**: For transcript data
3. **Database backup**: If using RDS (future enhancement)

## 📞 Support

If you encounter issues:

1. Check CloudWatch logs in AWS Console
2. SSH to EC2 and check application logs
3. Review the troubleshooting section above
4. Open an issue in the project repository

---

🎉 **Congratulations!** Your Architect Transcript Insights application is now deployed and accessible at `https://insights.melvin-jones.com`