#!/bin/bash

# User data script for EC2 instance deployment
yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
yum install -y nodejs

# Install Git
yum install -y git

# Install PM2 globally
npm install -g pm2

# Create application directory
mkdir -p /opt/architect-transcript-insights
cd /opt/architect-transcript-insights

# Clone repository (you'll need to replace this with your actual repo)
# git clone https://github.com/yourusername/architect-transcript-insights.git .

# For now, we'll create a placeholder for manual deployment
echo "Application directory created at /opt/architect-transcript-insights"
echo "Please deploy your application files here and run:"
echo "npm install"
echo "cp .env.example .env"
echo "# Edit .env with your configuration"
echo "npm run build"
echo "pm2 start npm --name 'transcript-app' -- start"

# Create environment file template
cat > /opt/architect-transcript-insights/.env.template << EOF
AWS_REGION=${region}
S3_BUCKET_NAME=${bucket_name}
PORT=3001
ENVIRONMENT=${environment}

# Add your AWS credentials here
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
EOF

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm

# Configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/opt/architect-transcript-insights/logs/app.log",
            "log_group_name": "/aws/application/architect-transcript-insights-${environment}",
            "log_stream_name": "{instance_id}-app",
            "timezone": "UTC"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s

# Create systemd service for application
cat > /etc/systemd/system/transcript-app.service << EOF
[Unit]
Description=Architect Transcript Insights Application
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/architect-transcript-insights
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service (will fail until application is deployed)
systemctl enable transcript-app.service

# Create log directory
mkdir -p /opt/architect-transcript-insights/logs
chown ec2-user:ec2-user /opt/architect-transcript-insights/logs

# Set ownership
chown -R ec2-user:ec2-user /opt/architect-transcript-insights

echo "EC2 instance setup complete. Deploy your application to /opt/architect-transcript-insights"