/**
 * Snagd Archive Module
 * Moves old completed tasks out of the active list
 * into an archive, rather than deleting them outright
 */

const ARCHIVE_KEY = 'archived_tasks';
const DEFAULT_ARCHIVE_AFTER_DAYS = 30;

/**
 * Retrieves all archived tasks
 * @returns {Promise<Array>} Archived tasks
 */
async function getArchivedTasks() {
  return new Promise((resolve) => {
    chrome.storage.local.get([ARCHIVE_KEY], (result) => {
      resolve(result[ARCHIVE_KEY] || []);
    });
  });
}

/**
 * Finds completed tasks older than the archive threshold
 * @param {Array} tasks - All active tasks
 * @param {number} afterDays - Days since completion to archive
 * @returns {Array} Tasks eligible for archiving
 */
function findTasksToArchive(tasks, afterDays = DEFAULT_ARCHIVE_AFTER_DAYS) {
  const cutoff = Date.now() - (afterDays * 24 * 60 * 60 * 1000);

  return tasks.filter(task =>
    task.status === 'completed' &&
    task.completed_at &&
    task.completed_at < cutoff
  );
}

/**
 * Moves the given tasks into the archive and removes
 * them from the active tasks array
 * @param {Array} tasks - All active tasks
 * @param {Array} tasksToArchive - Tasks to move
 * @returns {Promise<Array>} Remaining active tasks
 */
async function archiveTasks(tasks, tasksToArchive) {
  const archiveIds = new Set(tasksToArchive.map(t => t.id));
  const existing = await getArchivedTasks();

  const updatedArchive = [
    ...existing,
    ...tasksToArchive.map(t => ({ ...t, archived_at: Date.now() }))
  ];

  await new Promise((resolve) => {
    chrome.storage.local.set({ [ARCHIVE_KEY]: updatedArchive }, resolve);
  });

  return tasks.filter(t => !archiveIds.has(t.id));
}

/**
 * Restores a single archived task back to active tasks
 * @param {string} taskId - Task ID to restore
 * @returns {Promise<Object|null>} The restored task, or null if not found
 */
async function restoreFromArchive(taskId) {
  const archived = await getArchivedTasks();
  const task = archived.find(t => t.id === taskId);
  if (!task) return null;

  const remaining = archived.filter(t => t.id !== taskId);
  await new Promise((resolve) => {
    chrome.storage.local.set({ [ARCHIVE_KEY]: remaining }, resolve);
  });

  const { archived_at, ...restored } = task;
  return restored;
}

module.exports = {
  getArchivedTasks,
  findTasksToArchive,
  archiveTasks,
  restoreFromArchive
};
