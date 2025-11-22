#!/bin/bash
set -e

# Log everything to /var/log/user-data.log
exec > >(tee /var/log/user-data.log) 2>&1
echo "=== Starting user data script at $(date) ==="

# Variables
S3_BUCKET="${bucket_name}"
AWS_REGION="${region}"
ENVIRONMENT="${environment}"
APP_USER="appuser"
APP_HOME="/opt/architect-transcript-insights"
SERVICE_NAME="architect-transcript"

# Update system
echo "=== Updating system packages ==="
yum update -y

# Install essential packages
echo "=== Installing essential packages ==="
yum install -y \
    git \
    wget \
    curl \
    unzip \
    htop \
    nginx \
    amazon-cloudwatch-agent

# Install Node.js 18
echo "=== Installing Node.js 18 ==="
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Verify Node.js installation
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Install PM2 globally
echo "=== Installing PM2 ==="
npm install -g pm2

# Create application user
echo "=== Creating application user ==="
useradd -r -s /bin/false $APP_USER || true
mkdir -p $APP_HOME
chown $APP_USER:$APP_USER $APP_HOME

# Create environment file
echo "=== Creating environment configuration ==="
cat << 'EOF' > $APP_HOME/.env
# AWS Configuration
AWS_REGION=${region}
S3_BUCKET_NAME=${bucket_name}

# Application Configuration
NODE_ENV=production
PORT=3001
REACT_APP_API_BASE_URL=https://insights.melvin-jones.com/api
REACT_APP_WS_BASE_URL=wss://insights.melvin-jones.com

# Domain Configuration
DOMAIN_NAME=insights.melvin-jones.com

# Note: Cognito values will be populated by terraform outputs
# Add your actual API keys and Project IDs after deployment
EOF

# Set proper permissions
chown $APP_USER:$APP_USER $APP_HOME/.env
chmod 600 $APP_HOME/.env

# Configure nginx
echo "=== Configuring nginx ==="
cat << 'EOF' > /etc/nginx/conf.d/architect-transcript.conf
server {
    listen 80;
    server_name _;

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3001/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Increase timeouts for long-running requests
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # WebSocket endpoint
    location /transcribe {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific headers
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Increase timeouts for WebSocket
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Frontend routes (React app)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Handle client-side routing
        try_files $uri $uri/ @fallback;
    }

    location @fallback {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
EOF

# Test nginx configuration
nginx -t

# Create PM2 ecosystem file
echo "=== Creating PM2 ecosystem file ==="
cat << 'EOF' > $APP_HOME/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'architect-transcript-api',
      script: 'server/index.js',
      cwd: '/opt/architect-transcript-insights',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/architect-transcript-api-error.log',
      out_file: '/var/log/architect-transcript-api-out.log',
      log_file: '/var/log/architect-transcript-api.log',
      time: true
    },
    {
      name: 'architect-transcript-frontend',
      script: 'npm',
      args: 'run preview',
      cwd: '/opt/architect-transcript-insights',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/architect-transcript-frontend-error.log',
      out_file: '/var/log/architect-transcript-frontend-out.log',
      log_file: '/var/log/architect-transcript-frontend.log',
      time: true
    }
  ]
};
EOF

chown $APP_USER:$APP_USER $APP_HOME/ecosystem.config.js

# Configure CloudWatch agent
echo "=== Configuring CloudWatch agent ==="
cat << 'EOF' > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
{
    "agent": {
        "metrics_collection_interval": 60,
        "run_as_user": "cwagent"
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/user-data.log",
                        "log_group_name": "/aws/ec2/architect-transcript-insights/user-data",
                        "log_stream_name": "{instance_id}",
                        "timezone": "UTC"
                    },
                    {
                        "file_path": "/var/log/architect-transcript-*.log",
                        "log_group_name": "/aws/ec2/architect-transcript-insights/application",
                        "log_stream_name": "{instance_id}",
                        "timezone": "UTC"
                    },
                    {
                        "file_path": "/var/log/nginx/access.log",
                        "log_group_name": "/aws/ec2/architect-transcript-insights/nginx",
                        "log_stream_name": "{instance_id}-access",
                        "timezone": "UTC"
                    },
                    {
                        "file_path": "/var/log/nginx/error.log",
                        "log_group_name": "/aws/ec2/architect-transcript-insights/nginx",
                        "log_stream_name": "{instance_id}-error",
                        "timezone": "UTC"
                    }
                ]
            }
        }
    },
    "metrics": {
        "namespace": "ArchitectTranscriptInsights",
        "metrics_collected": {
            "cpu": {
                "measurement": [
                    "cpu_usage_idle",
                    "cpu_usage_iowait",
                    "cpu_usage_user",
                    "cpu_usage_system"
                ],
                "metrics_collection_interval": 60,
                "totalcpu": true
            },
            "disk": {
                "measurement": [
                    "used_percent"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "mem": {
                "measurement": [
                    "mem_used_percent"
                ],
                "metrics_collection_interval": 60
            }
        }
    }
}
EOF

# Create systemd service
echo "=== Creating systemd service ==="
cat << EOF > /etc/systemd/system/${SERVICE_NAME}.service
[Unit]
Description=Architect Transcript Insights Application
After=network.target

[Service]
Type=forking
User=$APP_USER
WorkingDirectory=$APP_HOME
Environment=NODE_ENV=production
ExecStart=/usr/bin/pm2 start ecosystem.config.js --env production
ExecReload=/usr/bin/pm2 reload ecosystem.config.js --env production
ExecStop=/usr/bin/pm2 kill
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create deployment script
echo "=== Creating deployment script ==="
cat << 'EOF' > /usr/local/bin/deploy-architect-transcript.sh
#!/bin/bash
set -e

APP_HOME="/opt/architect-transcript-insights"
APP_USER="appuser"

echo "=== Starting deployment at $(date) ==="

# Install/update application code here
cd $APP_HOME

if [ -f "package.json" ]; then
    echo "Installing dependencies..."
    sudo -u $APP_USER npm install --production
    
    echo "Building application..."
    sudo -u $APP_USER npm run build || true
fi

# Set proper permissions
chown -R $APP_USER:$APP_USER $APP_HOME
chmod 600 $APP_HOME/.env

# Restart services
echo "Restarting services..."
systemctl restart architect-transcript || true
systemctl restart nginx

echo "=== Deployment completed at $(date) ==="
EOF

chmod +x /usr/local/bin/deploy-architect-transcript.sh

# Enable services
echo "=== Enabling services ==="
systemctl enable nginx
systemctl enable $SERVICE_NAME
systemctl enable amazon-cloudwatch-agent

# Start CloudWatch agent
echo "=== Starting CloudWatch agent ==="
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s

# Start nginx
systemctl start nginx

# Set final permissions
chown -R $APP_USER:$APP_USER $APP_HOME
chmod 755 $APP_HOME

echo "=== User data script completed successfully at $(date) ==="
echo "=== Please deploy application code and run: /usr/local/bin/deploy-architect-transcript.sh ==="