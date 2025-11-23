# GitHub Repository Setup Guide

Follow these steps to activate automated CI/CD deployment:

## 1️⃣ Create GitHub Repository

### Option A: Using GitHub Website
1. Go to https://github.com/new
2. Repository name: `architect-transcript-insights`
3. Description: "Real-time meeting transcription and AI insights platform"
4. Set to Public or Private (your choice)
5. Click "Create repository"

### Option B: Using GitHub CLI (if you fix authentication)
```bash
# Login to GitHub CLI first
gh auth login

# Then run our setup script
./setup-github-automation.sh
```

## 2️⃣ Connect Local Repository to GitHub

```bash
# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/architect-transcript-insights.git

# Or if using SSH
git remote add origin git@github.com:YOUR_USERNAME/architect-transcript-insights.git
```

## 3️⃣ Configure GitHub Secrets

Go to: `https://github.com/YOUR_USERNAME/architect-transcript-insights/settings/secrets/actions`

Add these secrets:

### AWS_ACCESS_KEY_ID
```
Your AWS Access Key ID
```

### AWS_SECRET_ACCESS_KEY
```
Your AWS Secret Access Key
```

### EC2_PRIVATE_KEY
```
# Copy the entire contents of your PEM file:
cat ~/Downloads/melvin-jones.com-pair.pem
# Paste the entire key including:
-----BEGIN RSA PRIVATE KEY-----
[... key content ...]
-----END RSA PRIVATE KEY-----
```

## 4️⃣ Push Code to Trigger First Deployment

```bash
# Push all your code
git push -u origin main
```

This will:
- Upload all code to GitHub
- Trigger GitHub Actions workflow
- Automatically deploy to EC2
- Update CLAUDE.md with deployment info

## 5️⃣ Monitor Deployment

Watch your deployment at:
```
https://github.com/YOUR_USERNAME/architect-transcript-insights/actions
```

## 6️⃣ Add Optional Secrets (for full features)

Later, you can add these for complete functionality:

### ANTHROPIC_API_KEY
```
Your Anthropic API key for Claude
```

### CLAUDE_PROJECT_IDS
```
Your Claude Project IDs (comma-separated)
```

## ✅ Verification

After pushing, check:
1. GitHub Actions page shows green checkmark
2. Application works: http://architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com
3. CLAUDE.md is updated with deployment info

## 🎯 Your Workflow After Setup

From now on, just:
```bash
# Make changes locally
git add .
git commit -m "Your changes"
git push   # Automatically deploys!
```

## 🚨 Troubleshooting

If deployment fails:
- Check GitHub Actions logs
- Ensure secrets are correctly set
- Verify EC2 instance is running
- Check AWS credentials are valid

## Current Infrastructure
- **EC2 Instance**: i-021318587cae1ac80 (54.89.55.82)
- **Load Balancer**: architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com
- **S3 Bucket**: architect-transcripts-294417223953-prod
- **AWS Region**: us-east-1