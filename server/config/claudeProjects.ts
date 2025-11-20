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
 * Replace these with YOUR actual project information
 */
export const CLAUDE_PROJECT_MAPPING: Record<string, { name: string; description: string }> = {
  // Example mappings - replace with your actual project IDs and names:
  // 'proj_abc123': {
  //   name: 'AWS Architecture',
  //   description: 'AWS cloud architecture patterns and best practices'
  // },
  // 'proj_def456': {
  //   name: 'Microservices',
  //   description: 'Microservices design patterns and implementation'
  // },
  // 'proj_ghi789': {
  //   name: 'Security & Compliance',
  //   description: 'Security controls and compliance requirements'
  // }
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