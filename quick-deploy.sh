#\!/bin/bash

# Quick deployment script - Run this on your EC2 instance
echo "To deploy the application, SSH into your EC2 instance and run:"
echo ""
echo "ssh -i your-key.pem ec2-user@54.89.55.82"
echo ""
echo "Then run this command on the EC2:"
echo ""
echo 'curl -s https://architect-transcripts-294417223953-prod.s3.amazonaws.com/scripts/deploy.sh | sudo bash'
