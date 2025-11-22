#!/bin/bash
set -e

# Script to upgrade existing EC2 instance from t3.small to t3.medium
echo "🔄 Upgrading EC2 Instance to t3.medium"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Configuration
INSTANCE_ID="i-0d1d3e865797bf825"
NEW_INSTANCE_TYPE="t3.medium"
REGION="us-east-1"

# Check AWS CLI
print_status "Checking AWS CLI configuration..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    print_error "AWS CLI not configured. Run 'aws configure' first."
    exit 1
fi

# Check current instance status
print_status "Checking current instance status..."
CURRENT_STATE=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region $REGION \
    --query 'Reservations[0].Instances[0].State.Name' \
    --output text)

CURRENT_TYPE=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region $REGION \
    --query 'Reservations[0].Instances[0].InstanceType' \
    --output text)

print_status "Instance $INSTANCE_ID is currently $CURRENT_STATE with type $CURRENT_TYPE"

# Check if upgrade is needed
if [ "$CURRENT_TYPE" == "$NEW_INSTANCE_TYPE" ]; then
    print_status "Instance is already $NEW_INSTANCE_TYPE. No upgrade needed."
    exit 0
fi

# Stop the instance if running
if [ "$CURRENT_STATE" == "running" ]; then
    print_warning "Stopping instance $INSTANCE_ID..."
    aws ec2 stop-instances --instance-ids $INSTANCE_ID --region $REGION > /dev/null
    
    print_status "Waiting for instance to stop..."
    aws ec2 wait instance-stopped --instance-ids $INSTANCE_ID --region $REGION
    
    print_status "Instance stopped successfully."
elif [ "$CURRENT_STATE" == "stopped" ]; then
    print_status "Instance is already stopped."
else
    print_error "Instance is in state: $CURRENT_STATE. Can only modify stopped instances."
    exit 1
fi

# Modify instance type
print_status "Modifying instance type from $CURRENT_TYPE to $NEW_INSTANCE_TYPE..."
aws ec2 modify-instance-attribute \
    --instance-id $INSTANCE_ID \
    --instance-type Value=$NEW_INSTANCE_TYPE \
    --region $REGION

print_status "Instance type modified successfully."

# Start the instance
print_status "Starting instance $INSTANCE_ID..."
aws ec2 start-instances --instance-ids $INSTANCE_ID --region $REGION > /dev/null

print_status "Waiting for instance to start..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

# Get new public IP
NEW_PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region $REGION \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

print_status "Instance upgraded successfully! 🎉"
echo ""
echo "📋 Upgrade Summary:"
echo "==================="
echo "Instance ID: $INSTANCE_ID"
echo "Previous Type: $CURRENT_TYPE"
echo "New Type: $NEW_INSTANCE_TYPE"
echo "Public IP: $NEW_PUBLIC_IP"
echo ""

print_status "Next steps:"
echo "1. Update terraform.tfvars with the new public IP if needed"
echo "2. Run terraform plan to see infrastructure changes"
echo "3. Deploy the application with terraform apply"
echo ""

print_status "Instance upgrade complete! 🚀"