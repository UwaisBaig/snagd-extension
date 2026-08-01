/**
 * Snagd Bulk Actions Module
 * Applies an action to multiple selected tasks at once
 */

/**
 * Marks multiple tasks as completed
 * @param {Array} tasks - All tasks
 * @param {Array<string>} taskIds - IDs to mark complete
 * @returns {Array} Updated tasks array
 */
function bulkComplete(tasks, taskIds) {
  const idSet = new Set(taskIds);
  return tasks.map(task =>
    idSet.has(task.id)
      ? { ...task, status: 'completed', completed_at: Date.now() }
      : task
  );
}

/**
 * Deletes multiple tasks by ID
 * @param {Array} tasks - All tasks
 * @param {Array<string>} taskIds - IDs to delete
 * @returns {Array} Filtered tasks array
 */
function bulkDelete(tasks, taskIds) {
  const idSet = new Set(taskIds);
  return tasks.filter(task => !idSet.has(task.id));
}

/**
 * Moves multiple tasks into a project at once
 * @param {Array} tasks - All tasks
 * @param {Array<string>} taskIds - IDs to move
 * @param {string} projectId - Target project ID
 * @returns {Array} Updated tasks array
 */
function bulkMoveToProject(tasks, taskIds, projectId) {
  const idSet = new Set(taskIds);
  return tasks.map(task =>
    idSet.has(task.id) ? { ...task, projectId } : task
  );
}

/**
 * Tracks the current multi-select state in the popup UI
 */
class SelectionState {
  constructor() {
    this.selected = new Set();
  }

  toggle(taskId) {
    if (this.selected.has(taskId)) {
      this.selected.delete(taskId);
    } else {
      this.selected.add(taskId);
    }
  }

  selectAll(taskIds) {
    this.selected = new Set(taskIds);
  }

  clear() {
    this.selected.clear();
  }

  getSelectedIds() {
    return Array.from(this.selected);
  }

  count() {
    return this.selected.size;
  }
}

module.exports = {
  bulkComplete,
  bulkDelete,
  bulkMoveToProject,
  SelectionState
};
