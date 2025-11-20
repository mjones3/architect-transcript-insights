# Claude Projects Setup Guide

This guide helps you configure your ACTUAL Claude Projects with the Architect Transcript Insights tool.

## 📋 Prerequisites

1. **Claude Account**: You need an active Claude.ai account
2. **Existing Claude Projects**: You should have already created projects in Claude
3. **API Key**: Get your Anthropic API key from the Claude console

## 🔍 Finding Your Claude Project IDs

### Step 1: Access Your Claude Projects

1. Go to [claude.ai](https://claude.ai)
2. Log in to your account
3. Navigate to your Projects section

### Step 2: Get Project IDs

Your Claude Projects have unique IDs that look like:
- `proj_abc123xyz`
- `proj_def456uvw`
- `proj_ghi789rst`

**Note**: These are NOT the display names you see in the UI, but the actual project identifiers.

### Step 3: List Your Projects

Make a list of the projects you want to use with this tool:

| Project Name | Project ID | Purpose |
|-------------|------------|---------|
| Your AWS Architecture | proj_YOUR_ID_1 | AWS cloud patterns |
| Your Microservices | proj_YOUR_ID_2 | Service design |
| Your Security | proj_YOUR_ID_3 | Security controls |

## ⚙️ Configuration

### 1. Environment Variables

Add your actual project IDs to `.env`:

```env
# Your actual Claude Project IDs (comma-separated)
CLAUDE_PROJECT_IDS=proj_YOUR_ID_1,proj_YOUR_ID_2,proj_YOUR_ID_3

# Your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-your-actual-api-key
```

### 2. Optional: Friendly Names

Edit `server/config/claudeProjects.ts` to map your project IDs to friendly names:

```typescript
export const CLAUDE_PROJECT_MAPPING = {
  'proj_YOUR_ID_1': {
    name: 'AWS Architecture',
    description: 'My AWS cloud architecture patterns and decisions'
  },
  'proj_YOUR_ID_2': {
    name: 'Microservices Platform',
    description: 'Our microservices design and API contracts'
  },
  'proj_YOUR_ID_3': {
    name: 'Security & Compliance',
    description: 'Security controls and compliance requirements'
  }
};
```

## 🚀 How It Works

### When You Select Projects

```
Your Claude Projects in the UI:
☑ AWS Architecture (proj_YOUR_ID_1)
☑ Microservices Platform (proj_YOUR_ID_2)
☐ Security & Compliance (proj_YOUR_ID_3)
```

### What Happens

1. **During Meeting**:
   - Queries search through selected projects' knowledge
   - AI considers context from those projects

2. **After Meeting**:
   - Full transcript uploaded to each selected project
   - Projects accumulate knowledge over time
   - Future queries can reference past meetings

## 📊 Project Organization Tips

### Recommended Project Structure

Create Claude Projects based on:

1. **Technology Domains**
   - Cloud Infrastructure
   - Frontend Architecture
   - Backend Services
   - Data Platform

2. **Business Domains**
   - Customer Experience
   - Payment Systems
   - Analytics Platform
   - Security Infrastructure

3. **Team/Product Based**
   - Team Alpha Projects
   - Team Beta Projects
   - Product X Architecture
   - Product Y Infrastructure

### Best Practices

1. **Keep Projects Focused**: Each project should have a clear domain
2. **Regular Updates**: Upload transcripts consistently to build knowledge
3. **Descriptive Names**: Use clear project names for easy identification
4. **Document Decisions**: Ensure architectural decisions are captured

## 🔧 Troubleshooting

### No Projects Showing Up?

1. Check your `.env` file has `CLAUDE_PROJECT_IDS` set
2. Verify the project IDs are correct (not display names)
3. Ensure IDs are comma-separated with no spaces
4. Restart the server after updating `.env`

### Projects Not Accessible?

1. Verify your API key has access to the projects
2. Check that projects exist in your Claude account
3. Ensure you're using the correct account

### Example Working Configuration

`.env`:
```env
ANTHROPIC_API_KEY=sk-ant-api03-abc123...
CLAUDE_PROJECT_IDS=proj_K5x9mN2p,proj_L7w3qR8t,proj_M4v6sT1u
```

`server/config/claudeProjects.ts`:
```typescript
export const CLAUDE_PROJECT_MAPPING = {
  'proj_K5x9mN2p': {
    name: 'Cloud Architecture',
    description: 'AWS and cloud design patterns'
  },
  'proj_L7w3qR8t': {
    name: 'API Design',
    description: 'REST and GraphQL API patterns'
  },
  'proj_M4v6sT1u': {
    name: 'Security',
    description: 'Security and compliance docs'
  }
};
```

## 📚 Using Projects Effectively

### During Meetings

1. **Select Relevant Projects**: Choose projects related to the meeting topic
2. **Query for Context**: Ask questions to get relevant past decisions
3. **Capture Everything**: Let the tool record the full discussion

### After Meetings

1. **Review Summary**: Check that key points were captured
2. **Verify Upload**: Ensure transcript was uploaded to selected projects
3. **Test Queries**: Try querying the project to verify knowledge was added

## 🎯 Expected Outcome

After proper setup, you should see:

1. Your actual Claude Projects as checkboxes in the header
2. Ability to query against your project knowledge
3. Full transcripts uploading to your selected projects
4. Growing knowledge base with each meeting

## 💡 Tips

- Start with a few key projects and expand later
- Use consistent project selection for related meetings
- Build domain-specific knowledge in focused projects
- Review and clean up projects periodically

---

**Remember**: This tool enhances YOUR existing Claude Projects with meeting transcripts and architectural decisions. The more you use it, the more valuable your project knowledge becomes!