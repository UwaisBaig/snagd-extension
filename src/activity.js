/**
 * Snagd Activity Log Module
 * Records task lifecycle events for
 * display in the Activity tab
 */

const ACTIVITY_KEY = 'activity_log';
const MAX_LOG_ENTRIES = 200;

/**
 * Event type constants
 */
const ACTIVITY_TYPE = {
  CREATED: 'created',
  COMPLETED: 'completed',
  DELETED: 'deleted',
  EDITED: 'edited'
};

/**
 * Logs an activity event, trimming the log
 * to MAX_LOG_ENTRIES to prevent unbounded growth
 * @param {string} type - One of ACTIVITY_TYPE
 * @param {Object} task - The task involved
 */
async function logActivity(type, task) {
  const log = await getActivityLog();

  log.unshift({
    type,
    taskId: task.id,
    taskTitle: task.title,
    timestamp: Date.now()
  });

  const trimmed = log.slice(0, MAX_LOG_ENTRIES);

  return new Promise((resolve) => {
    chrome.storage.local.set({ [ACTIVITY_KEY]: trimmed }, resolve);
  });
}

/**
 * Retrieves the full activity log, most recent first
 * @returns {Promise<Array>} Activity log entries
 */
async function getActivityLog() {
  return new Promise((resolve) => {
    chrome.storage.local.get([ACTIVITY_KEY], (result) => {
      resolve(result[ACTIVITY_KEY] || []);
    });
  });
}

/**
 * Gets a human-readable label for an activity entry
 * @param {Object} entry - Activity log entry
 * @returns {string} Label like "Completed 'Buy milk'"
 */
function getActivityLabel(entry) {
  const labels = {
    [ACTIVITY_TYPE.CREATED]: 'Created',
    [ACTIVITY_TYPE.COMPLETED]: 'Completed',
    [ACTIVITY_TYPE.DELETED]: 'Deleted',
    [ACTIVITY_TYPE.EDITED]: 'Edited'
  };
  return `${labels[entry.type] || entry.type} "${entry.taskTitle}"`;
}

/**
 * Clears the entire activity log
 */
async function clearActivityLog() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [ACTIVITY_KEY]: [] }, resolve);
  });
}

module.exports = {
  ACTIVITY_TYPE,
  logActivity,
  getActivityLog,
  getActivityLabel,
  clearActivityLog
};
