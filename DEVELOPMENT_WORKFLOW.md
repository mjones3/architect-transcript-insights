# Development Workflow - Architect Transcript Insights

## 🚀 Quick Start for Development

### Local Development
```bash
# Start both frontend and backend locally
npm run dev        # Frontend on http://localhost:5173
npm run server     # Backend on http://localhost:3001

# Or run both together
npm start
```

### Deploy Changes
```bash
# Use the iterative deployment script
./deploy-iterative.sh

# Choose what to deploy:
# 1) Frontend only - for UI changes
# 2) Backend only - for API changes  
# 3) Both - for full updates
# 4) Config only - for environment changes
# 5) Hotfix - for single file updates
```

## 📁 Project Structure for Development

```
architect-transcript-insights/
├── CLAUDE.md              # ← Session state for Claude (ALWAYS UPDATE THIS)
├── .env.local            # ← Local development environment
├── .env.production       # ← Production environment (copy to EC2)
├── src/                  # ← React frontend code
│   ├── components/       #    - UI components
│   └── services/         #    - API clients
├── server/               # ← Express backend code
│   ├── routes/          #    - API endpoints
│   └── services/        #    - Business logic
├── deploy-iterative.sh  # ← Main deployment script
└── terraform/           # ← Infrastructure as code
```

## 🔄 Iterative Development Process

### 1. Make Local Changes
```bash
# Edit your code
code .  # Open in VS Code

# Test locally
npm run dev     # Frontend
npm run server  # Backend
```

### 2. Test Changes
```bash
# Run tests (when available)
npm test

# Test API endpoints
curl http://localhost:3001/health

# Test WebSocket connection
wscat -c ws://localhost:3001
```

### 3. Deploy to EC2
```bash
# Deploy your changes
./deploy-iterative.sh

# Check logs
ssh -i ~/Downloads/melvin-jones.com-pair.pem ec2-user@54.89.55.82
pm2 logs
```

### 4. Update Session State
```bash
# IMPORTANT: Update CLAUDE.md after each session
echo "- $(date): Description of changes" >> CLAUDE.md
git commit -am "Update session state"
```

## 🔧 Common Development Tasks

### Adding New Features
1. Create feature branch: `git checkout -b feature/your-feature`
2. Develop locally with hot reload
3. Test with `./deploy-iterative.sh` option 3
4. Update CLAUDE.md with feature status
5. Merge when ready

### Fixing Bugs
1. Identify issue in logs: `pm2 logs`
2. Fix locally
3. Deploy with `./deploy-iterative.sh` option 5 (hotfix)
4. Verify fix in production

### Updating Dependencies
```bash
# Update locally
npm update

# Test thoroughly
npm run dev

# Deploy new package.json
./deploy-iterative.sh  # Choose option 2 or 3
```

### Environment Variables
```bash
# Local development (.env.local)
VITE_API_URL=http://localhost:3001
ANTHROPIC_API_KEY=your-dev-key

# Production (.env.production)
VITE_API_URL=http://architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com
ANTHROPIC_API_KEY=your-prod-key

# Deploy env changes
./deploy-iterative.sh  # Choose option 4
```

## 🧠 State Management for Claude

### What to Track in CLAUDE.md
- Current deployment status
- Known issues and bugs
- TODO items
- Recent changes
- API keys needed (not the actual keys)
- Architecture decisions
- Performance notes

### Update After Each Session
```bash
# Add session notes
cat >> CLAUDE.md << EOF

## Session $(date +%Y-%m-%d)
- Fixed: [issue description]
- Added: [feature description]
- TODO: [next steps]
- Notes: [important observations]
EOF
```

## 🚢 CI/CD Pipeline (Future)

### GitHub Actions Workflow (to be implemented)
```yaml
# .github/workflows/deploy.yml
name: Deploy to EC2
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm run build
      - run: ./deploy-iterative.sh
```

### Current Manual Pipeline
1. Develop locally
2. Test thoroughly
3. Run `./deploy-iterative.sh`
4. Monitor logs
5. Update CLAUDE.md

## 📊 Monitoring

### Check Application Health
```bash
# From local
curl http://architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com/health

# On EC2
pm2 status
pm2 monit
```

### View Logs
```bash
# SSH to EC2
ssh -i ~/Downloads/melvin-jones.com-pair.pem ec2-user@54.89.55.82

# View PM2 logs
pm2 logs

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### AWS Console Monitoring
- CloudWatch Logs: Check for application errors
- Target Groups: Monitor health check status
- Load Balancer: View request metrics

## 🔥 Rollback Procedure

If deployment fails:
```bash
# SSH to EC2
ssh -i ~/Downloads/melvin-jones.com-pair.pem ec2-user@54.89.55.82

# List backups
ls -la /opt/backups/

# Restore from backup
sudo cp -r /opt/backups/[timestamp]/* /opt/architect-transcript-insights/
pm2 restart all
```

## 📝 Development Checklist

Before deploying:
- [ ] Code tested locally
- [ ] Environment variables updated
- [ ] CLAUDE.md updated with changes
- [ ] Backup strategy confirmed
- [ ] Health endpoint tested

After deploying:
- [ ] Application responds on ALB
- [ ] Logs checked for errors
- [ ] Features tested in production
- [ ] CLAUDE.md updated with results
- [ ] Team notified of changes

## 🚨 Troubleshooting

### Node.js Issues on EC2
```bash
# Use nvm to manage Node versions
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 16
nvm use 16
```

### PM2 Not Starting
```bash
pm2 kill
pm2 start server/index.js --name api
pm2 save
pm2 startup
```

### Nginx Issues
```bash
sudo nginx -t  # Test config
sudo systemctl restart nginx
sudo tail -f /var/log/nginx/error.log
```

## 💡 Tips for Continuous Improvement

1. **Small, Frequent Deploys**: Deploy often with small changes
2. **Feature Flags**: Use environment variables to toggle features
3. **Monitor First**: Always check logs before and after deployment
4. **Document Everything**: Update CLAUDE.md religiously
5. **Test in Production**: Use the ALB URL for real-world testing

## 🎯 Next Steps

1. Set up proper Node.js environment on EC2
2. Implement WebSocket for real-time features
3. Add GitHub Actions for automated deployment
4. Configure monitoring and alerting
5. Implement blue-green deployment strategy

---

Remember: **Always update CLAUDE.md** - it's your persistent state between Claude sessions!