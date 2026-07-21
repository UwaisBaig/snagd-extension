/**
 * Snagd Projects Module
 * Groups tasks under named projects for
 * the Projects tab in the popup dashboard
 */

const PROJECTS_KEY = 'projects';

/**
 * Retrieves all projects from local storage
 * @returns {Promise<Array>} Array of project objects
 */
async function getAllProjects() {
  return new Promise((resolve) => {
    chrome.storage.local.get([PROJECTS_KEY], (result) => {
      resolve(result[PROJECTS_KEY] || []);
    });
  });
}

/**
 * Creates a new project
 * @param {string} name - Project name
 * @param {string} color - Hex color for the project tag
 * @returns {Promise<Object>} The created project
 */
async function createProject(name, color = '#0D9488') {
  const projects = await getAllProjects();
  const project = {
    id: 'proj_' + Date.now(),
    name: name.slice(0, 60),
    color,
    created_at: Date.now()
  };
  projects.push(project);
  await new Promise((resolve) => {
    chrome.storage.local.set({ [PROJECTS_KEY]: projects }, resolve);
  });
  return project;
}

/**
 * Assigns a task to a project by ID
 * @param {Object} task - Task object
 * @param {string} projectId - Project ID to assign
 * @returns {Object} Task with projectId set
 */
function assignTaskToProject(task, projectId) {
  return { ...task, projectId };
}

/**
 * Groups a list of tasks by their project ID
 * @param {Array} tasks - All tasks
 * @returns {Object} Map of projectId -> tasks[]
 */
function groupTasksByProject(tasks) {
  return tasks.reduce((groups, task) => {
    const key = task.projectId || 'unassigned';
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
    return groups;
  }, {});
}

/**
 * Deletes a project. Tasks assigned to it
 * fall back to "unassigned", they are not deleted.
 * @param {string} projectId - Project to delete
 */
async function deleteProject(projectId) {
  const projects = await getAllProjects();
  const filtered = projects.filter(p => p.id !== projectId);
  return new Promise((resolve) => {
    chrome.storage.local.set({ [PROJECTS_KEY]: filtered }, resolve);
  });
}

module.exports = {
  getAllProjects,
  createProject,
  assignTaskToProject,
  groupTasksByProject,
  deleteProject
};
