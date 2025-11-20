#!/bin/bash

# AWS Deployment Script for Architect Transcript Insights

set -e

echo "🚀 Starting deployment of Architect Transcript Insights..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if environment variables are set
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create it from .env.example"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Variables
STACK_NAME="architect-transcript-insights"
REGION=${AWS_REGION:-"us-east-1"}
BUCKET_NAME=${S3_BUCKET_NAME:-"architect-transcripts"}

echo "📦 Creating S3 bucket for transcripts..."
aws s3 mb s3://$BUCKET_NAME --region $REGION 2>/dev/null || echo "Bucket already exists"

# Enable versioning on S3 bucket
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled

# Enable encryption on S3 bucket
aws s3api put-bucket-encryption \
    --bucket $BUCKET_NAME \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            }
        }]
    }'

echo "🔐 Creating IAM role and policy..."

# Create IAM policy
cat > /tmp/transcript-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "transcribe:StartStreamTranscription",
        "transcribe:StartStreamTranscriptionWebSocket"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:PutObjectTagging"
      ],
      "Resource": [
        "arn:aws:s3:::$BUCKET_NAME",
        "arn:aws:s3:::$BUCKET_NAME/*"
      ]
    }
  ]
}
EOF

# Create the policy
POLICY_ARN=$(aws iam create-policy \
    --policy-name TranscriptInsightsPolicy \
    --policy-document file:///tmp/transcript-policy.json \
    --query 'Policy.Arn' \
    --output text 2>/dev/null || \
    aws iam list-policies --query "Policies[?PolicyName=='TranscriptInsightsPolicy'].Arn" --output text)

echo "Policy ARN: $POLICY_ARN"

# Build the application
echo "🔨 Building application..."
npm run build

# Create deployment package
echo "📦 Creating deployment package..."
zip -r deploy.zip dist/ server/ package.json package-lock.json .env

echo "✅ Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Deploy to your preferred platform (EC2, ECS, Amplify)"
echo "2. Set up HTTPS with a certificate"
echo "3. Configure DNS for your domain"
echo "4. Enable CloudWatch logging"
echo ""
echo "For EC2 deployment:"
echo "  - Use the deploy.zip file"
echo "  - Install Node.js on the instance"
echo "  - Extract and run: npm install --production && npm start"
echo ""
echo "For Amplify deployment:"
echo "  - Connect your GitHub repository"
echo "  - Amplify will auto-detect the build settings"
echo ""
echo "🎉 Deployment script complete!"