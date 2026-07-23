/**
 * Snagd Reminders Module
 * Schedules a one-off notification for an
 * individual task's due date, independent
 * of the weekly nudge system
 */

/**
 * Builds the alarm name for a given task
 * @param {string} taskId - Task ID
 * @returns {string} Alarm name
 */
function alarmNameFor(taskId) {
  return `reminder_${taskId}`;
}

/**
 * Schedules a reminder for a task's due date.
 * Fires once, does not repeat.
 * @param {Object} task - Task with dueDate set
 */
async function scheduleTaskReminder(task) {
  if (!task.dueDate) return;

  const alarmName = alarmNameFor(task.id);
  await chrome.alarms.clear(alarmName);

  const dueTime = new Date(task.dueDate).getTime();
  if (dueTime <= Date.now()) return; // don't schedule past reminders

  chrome.alarms.create(alarmName, { when: dueTime });
}

/**
 * Cancels a scheduled reminder for a task
 * (call this when a task is completed or deleted)
 * @param {string} taskId - Task ID
 */
async function cancelTaskReminder(taskId) {
  await chrome.alarms.clear(alarmNameFor(taskId));
}

/**
 * Fires the actual notification for a due task.
 * Wire this into chrome.alarms.onAlarm in background.js.
 * @param {Object} task - The task that's now due
 */
function fireTaskReminder(task) {
  chrome.notifications.create(`notif_${task.id}`, {
    type: 'basic',
    iconUrl: '../icons/icon48.png',
    title: 'Snagd — Task Due',
    message: task.title,
    priority: 2
  });
}

/**
 * Checks whether an alarm name belongs to
 * the per-task reminder system (vs. the
 * weekly nudge alarm)
 * @param {string} alarmName
 * @returns {boolean}
 */
function isTaskReminderAlarm(alarmName) {
  return alarmName.startsWith('reminder_');
}

/**
 * Extracts the task ID back out of an alarm name
 * @param {string} alarmName
 * @returns {string} Task ID
 */
function taskIdFromAlarm(alarmName) {
  return alarmName.replace('reminder_', '');
}

module.exports = {
  scheduleTaskReminder,
  cancelTaskReminder,
  fireTaskReminder,
  isTaskReminderAlarm,
  taskIdFromAlarm
};
