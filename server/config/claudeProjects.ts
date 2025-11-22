/**
 * Claude Projects Configuration
 * 
 * Configure your ACTUAL Claude Projects here.
 * 
 * To find your Claude Project IDs:
 * 1. Go to claude.ai
 * 2. Navigate to your Projects
 * 3. Copy the project IDs
 * 
 * Add them to the CLAUDE_PROJECT_IDS environment variable and
 * optionally configure display names and descriptions below.
 */

export interface ProjectConfig {
  id: string;
  name: string;
  description: string;
}

/**
 * Map your actual Claude Project IDs to friendly display names
 * These are YOUR actual Claude Projects from claude.ai
 */
export const CLAUDE_PROJECT_MAPPING: Record<string, { name: string; description: string }> = {
  '01983cde-a499-73f5-80df-2a28adc95a4b': {
    name: 'ARC-One SA',
    description: 'Architecture One Solutions Architecture'
  },
  '0198849d-9ff8-77bd-9aaf-53c26ea60dbb': {
    name: 'API Governance',
    description: 'API Governance and Standards'
  },
  '0198af43-3f19-712a-819e-53048f53527d': {
    name: 'Collections',
    description: 'Collections and Data Management'
  },
  '01988137-d3be-74da-9c60-ce26f8abf76b': {
    name: 'SOPs',
    description: 'Standard Operating Procedures'
  },
  '019929e9-0515-767e-aec0-4ec7a754c933': {
    name: 'Event Governance',
    description: 'Event Governance and Management'
  },
  '019884b1-6d02-76cc-922f-908590186a5d': {
    name: 'Interface Exception Dashboard',
    description: 'Interface Exception Monitoring and Dashboard'
  }
};

/**
 * Get configured Claude Projects from environment
 */
export function getConfiguredProjects(): ProjectConfig[] {
  const projectIds = process.env.CLAUDE_PROJECT_IDS?.split(',').map(id => id.trim()) || [];
  
  if (projectIds.length === 0) {
    console.warn('⚠️  No Claude Projects configured!');
    console.warn('Add your actual Claude Project IDs to CLAUDE_PROJECT_IDS in your .env file');
    console.warn('Example: CLAUDE_PROJECT_IDS=proj_abc123,proj_def456,proj_ghi789');
    return [];
  }

  return projectIds.map(id => ({
    id,
    name: CLAUDE_PROJECT_MAPPING[id]?.name || id,
    description: CLAUDE_PROJECT_MAPPING[id]?.description || `Claude Project: ${id}`
  }));
}

/**
 * Validate that a project ID exists in the configured projects
 */
export function isValidProjectId(projectId: string): boolean {
  const projectIds = process.env.CLAUDE_PROJECT_IDS?.split(',').map(id => id.trim()) || [];
  return projectIds.includes(projectId);
}

/**
 * Get a single project configuration by ID
 */
export function getProjectById(projectId: string): ProjectConfig | null {
  if (!isValidProjectId(projectId)) {
    return null;
  }
  
  return {
    id: projectId,
    name: CLAUDE_PROJECT_MAPPING[projectId]?.name || projectId,
    description: CLAUDE_PROJECT_MAPPING[projectId]?.description || `Claude Project: ${projectId}`
  };
}