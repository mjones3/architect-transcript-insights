import React, { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown, FolderOpen } from 'lucide-react';
import { Project } from '../types';

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjects: string[];
  onSelectionChange: (selected: string[]) => void;
}

export default function ProjectSelector({ projects, selectedProjects, onSelectionChange }: ProjectSelectorProps) {
  const handleToggleProject = (projectId: string) => {
    if (selectedProjects.includes(projectId)) {
      onSelectionChange(selectedProjects.filter(id => id !== projectId));
    } else {
      onSelectionChange([...selectedProjects, projectId]);
    }
  };

  const selectedProjectNames = projects
    .filter(p => selectedProjects.includes(p.id))
    .map(p => p.name)
    .join(', ');

  return (
    <div className="relative">
      <Listbox value={selectedProjects} onChange={() => {}}>
        <div className="relative">
          <Listbox.Button className="relative w-64 cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm">
            <span className="flex items-center">
              <FolderOpen className="h-4 w-4 text-gray-400 mr-2" />
              <span className="block truncate">
                {selectedProjectNames || 'Select projects...'}
              </span>
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
              {projects.map((project) => (
                <Listbox.Option
                  key={project.id}
                  className="relative cursor-pointer select-none py-2 pl-10 pr-4 hover:bg-indigo-50"
                  value={project.id}
                  onClick={(e) => {
                    e.preventDefault();
                    handleToggleProject(project.id);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`block truncate ${
                        selectedProjects.includes(project.id) ? 'font-medium' : 'font-normal'
                      }`}>
                        {project.name}
                      </span>
                      {project.description && (
                        <span className="text-xs text-gray-500">{project.description}</span>
                      )}
                    </div>
                  </div>
                  {selectedProjects.includes(project.id) && (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}