# Manual Deployment Instructions

The infrastructure is deployed with:
- **Load Balancer**: `architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com`
- **EC2 Instance**: `i-021318587cae1ac80` (IP: `54.89.55.82`)
- **S3 Bucket**: `architect-transcripts-294417223953-prod`
- **Target Groups**: Configured but instance is unhealthy

## To complete the deployment:

### 1. SSH into the EC2 instance:
```bash
ssh -i your-key.pem ec2-user@54.89.55.82
```

### 2. Install Node.js and dependencies:
```bash
# Install Node.js
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install nginx if not already installed
sudo yum install -y nginx
```

### 3. Deploy the application:
```bash
# Create app directory
sudo mkdir -p /opt/architect-transcript-insights
cd /opt/architect-transcript-insights

# Download application from S3
aws s3 cp s3://architect-transcripts-294417223953-prod/deployments/app-deploy.tar.gz .
tar -xzf app-deploy.tar.gz

# Install dependencies
npm install --production

# Build the application
npm run build
```

### 4. Create environment file:
```bash
sudo nano /opt/architect-transcript-insights/.env
```

Add:
```
AWS_REGION=us-east-1
S3_BUCKET_NAME=architect-transcripts-294417223953-prod
NODE_ENV=production
PORT=3001
# Add your ANTHROPIC_API_KEY here
```

### 5. Configure nginx:
```bash
sudo nano /etc/nginx/conf.d/app.conf
```

Add:
```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        proxy_pass http://127.0.0.1:3001/health;
    }
}
```

### 6. Start services:
```bash
# Start nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Start application with PM2
cd /opt/architect-transcript-insights
pm2 start server/index.js --name api -- --port 3001
pm2 start npm --name frontend -- run preview
pm2 save
pm2 startup systemd -u ec2-user --hp /home/ec2-user
```

### 7. Verify deployment:
```bash
# Check PM2 status
pm2 status

# Check nginx status
sudo systemctl status nginx

# Test locally
curl http://localhost:80
curl http://localhost:3001/health
```

## Testing the Load Balancer:

Once the application is running on the EC2 instance, the load balancer should detect it as healthy within 30-60 seconds.

Test with:
```bash
curl http://architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com
```

## Current Status:
- ✅ Infrastructure deployed (Load Balancer, Target Groups, EC2 instance)
- ✅ Application package uploaded to S3
- ⚠️ Application not yet running on EC2 (needs manual deployment)
- ⚠️ Target health checks failing (will resolve once app is running)

## Next Steps:
1. SSH into the EC2 instance
2. Follow the deployment steps above
3. Add your ANTHROPIC_API_KEY to the .env file
4. Verify the application is accessible through the load balancer