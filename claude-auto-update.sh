#!/bin/bash

# This script is used by Claude to automatically update CLAUDE.md
# Usage: ./claude-auto-update.sh "description of changes"

CHANGE_DESCRIPTION="$1"
if [ -z "$CHANGE_DESCRIPTION" ]; then
    CHANGE_DESCRIPTION="Automated update"
fi

# Update CLAUDE.md with session information
cat >> CLAUDE.md << EOF

## Session $(date +%Y-%m-%d\ %H:%M)
- **Change**: $CHANGE_DESCRIPTION
- **Commit**: $(git rev-parse HEAD 2>/dev/null || echo "Not committed yet")
- **Status**: Development in progress
- **Files modified**: $(git diff --name-only 2>/dev/null | tr '\n' ', ' | sed 's/,$//' || echo "Unknown")

### Current State
- Infrastructure: Deployed and operational
- Application: $([ -f server/index.ts ] && echo "Full Node.js app ready" || echo "Basic placeholder")
- Load Balancer: http://architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com
- Target Health: $(curl -s -o /dev/null -w "%{http_code}" http://architect-transcript-alb-343036505.us-east-1.elb.amazonaws.com 2>/dev/null || echo "Unknown")

### TODO for Next Session
- [ ] Deploy full transcript application (not just placeholder)
- [ ] Add API keys (ANTHROPIC_API_KEY, CLAUDE_PROJECT_IDS)
- [ ] Test audio recording and WebSocket features
- [ ] Verify real-time transcription works
- [ ] Add authentication flow

EOF

echo "CLAUDE.md updated with: $CHANGE_DESCRIPTION"