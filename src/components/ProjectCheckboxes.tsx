import React from 'react';
import { Check, FolderOpen, Brain } from 'lucide-react';
import { Project } from '../types';

interface ProjectCheckboxesProps {
  projects: Project[];
  selectedProjects: string[];
  onSelectionChange: (selected: string[]) => void;
  isCompact?: boolean;
}

export default function ProjectCheckboxes({ 
  projects, 
  selectedProjects, 
  onSelectionChange,
  isCompact = false 
}: ProjectCheckboxesProps) {
  
  const handleToggleProject = (projectId: string) => {
    if (selectedProjects.includes(projectId)) {
      onSelectionChange(selectedProjects.filter(id => id !== projectId));
    } else {
      onSelectionChange([...selectedProjects, projectId]);
    }
  };

  if (projects.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <Brain className="h-4 w-4" />
        <span>Loading Claude Projects...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${isCompact ? 'space-x-3' : 'space-x-4'}`}>
      <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
        <FolderOpen className="h-4 w-4" />
        <span>Claude Projects:</span>
      </div>
      
      <div className="flex items-center space-x-3 flex-wrap">
        {projects.map((project) => (
          <label
            key={project.id}
            className={`
              flex items-center space-x-2 cursor-pointer
              px-3 py-1.5 rounded-lg border transition-all
              ${selectedProjects.includes(project.id)
                ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                : 'bg-white border-gray-200 hover:border-gray-300'
              }
            `}
            title={project.description}
          >
            <input
              type="checkbox"
              checked={selectedProjects.includes(project.id)}
              onChange={() => handleToggleProject(project.id)}
              className="sr-only"
            />
            
            <div className={`
              w-4 h-4 rounded border-2 flex items-center justify-center transition-all
              ${selectedProjects.includes(project.id)
                ? 'bg-indigo-600 border-indigo-600'
                : 'bg-white border-gray-300'
              }
            `}>
              {selectedProjects.includes(project.id) && (
                <Check className="h-3 w-3 text-white" />
              )}
            </div>
            
            <span className={`
              text-sm font-medium transition-colors
              ${selectedProjects.includes(project.id)
                ? 'text-indigo-700'
                : 'text-gray-700'
              }
            `}>
              {project.name}
            </span>
            
            {selectedProjects.includes(project.id) && (
              <span className="text-xs text-indigo-600 font-semibold">
                ✓
              </span>
            )}
          </label>
        ))}
      </div>
      
      {selectedProjects.length > 0 && (
        <div className="flex items-center space-x-1 text-xs text-indigo-600 font-medium ml-2">
          <span>{selectedProjects.length}</span>
          <span>selected</span>
        </div>
      )}
    </div>
  );
}