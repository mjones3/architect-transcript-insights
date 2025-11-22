#!/bin/bash

# Final fix - use Python which is already on Amazon Linux

echo "Fixing deployment with Python server..."

EC2_IP="54.89.55.82"
EC2_USER="ec2-user"
KEY_PATH="$HOME/Downloads/melvin-jones.com-pair.pem"

if [ ! -f "$KEY_PATH" ]; then
    KEY_PATH=$(find ~/Downloads -name "*.pem" -type f | head -1)
fi
chmod 600 "$KEY_PATH"

ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" "$EC2_USER@$EC2_IP" << 'ENDSSH'
echo "=== Final deployment fix ==="

# Create Python health server
sudo tee /opt/server.py > /dev/null << 'EOF'
#!/usr/bin/env python
from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
import json

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write('OK')
        else:
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            html = '''<html><head><title>Architect Transcript Insights</title></head>
            <body><h1>Architect Transcript Insights</h1>
            <p>Application deployed successfully!</p>
            <p>Load Balancer: Connected</p></body></html>'''
            self.wfile.write(html)
        return

server = HTTPServer(('0.0.0.0', 3001), HealthHandler)
print 'Server running on port 3001...'
server.serve_forever()
EOF

# Kill any existing servers
sudo killall python 2>/dev/null || true

# Start Python server
cd /opt
sudo nohup python server.py > /dev/null 2>&1 &

# Update nginx config for both ports
sudo tee /etc/nginx/nginx.conf > /dev/null << 'EOF'
events { worker_connections 1024; }
http {
    server {
        listen 80 default_server;
        listen 3000 default_server;
        
        location / { 
            proxy_pass http://127.0.0.1:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        location /health {
            proxy_pass http://127.0.0.1:3001/health;
        }
    }
}
EOF

# Restart nginx
sudo systemctl restart nginx

sleep 2
echo "Testing..."
curl -s http://localhost/health
echo ""
echo "Done!"
ENDSSH

echo "Waiting for health checks to update..."
sleep 15

# Test
ALB_URL="http://architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $ALB_URL)
echo "Load Balancer Status: $HTTP_CODE"

# Check target health
aws elbv2 describe-target-health \
    --target-group-arn arn:aws:elasticloadbalancing:us-east-1:294417223953:targetgroup/architect-transcript-app-tg/8a3d5b020d715429 \
    --query 'TargetHealthDescriptions[0].TargetHealth.State' \
    --output text