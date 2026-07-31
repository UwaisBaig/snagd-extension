/**
 * Snagd Snooze Module
 * Quickly postpones a task's due date by a preset
 * amount, independent of manually editing the due date
 */

const SNOOZE_PRESETS = {
  ONE_HOUR: 'one_hour',
  TOMORROW: 'tomorrow',
  NEXT_WEEK: 'next_week'
};

/**
 * Calculates the new due date for a given snooze preset
 * @param {string} preset - One of SNOOZE_PRESETS
 * @param {Date} from - Reference time, defaults to now
 * @returns {string} New due date as ISO string
 */
function calculateSnoozeDate(preset, from = new Date()) {
  const date = new Date(from);

  switch (preset) {
    case SNOOZE_PRESETS.ONE_HOUR:
      date.setHours(date.getHours() + 1);
      break;
    case SNOOZE_PRESETS.TOMORROW:
      date.setDate(date.getDate() + 1);
      date.setHours(9, 0, 0, 0);
      break;
    case SNOOZE_PRESETS.NEXT_WEEK:
      date.setDate(date.getDate() + 7);
      date.setHours(9, 0, 0, 0);
      break;
    default:
      throw new Error(`Unknown snooze preset: ${preset}`);
  }

  return date.toISOString();
}

/**
 * Applies a snooze to a task, returning the updated task
 * @param {Object} task - Task to snooze
 * @param {string} preset - One of SNOOZE_PRESETS
 * @returns {Object} Updated task with new due date
 */
function snoozeTask(task, preset) {
  return {
    ...task,
    dueDate: calculateSnoozeDate(preset),
    snoozed_at: Date.now(),
    snooze_count: (task.snooze_count || 0) + 1
  };
}

/**
 * Gets a human-readable label for a snooze preset
 * @param {string} preset - One of SNOOZE_PRESETS
 * @returns {string} Display label
 */
function getSnoozeLabel(preset) {
  const labels = {
    [SNOOZE_PRESETS.ONE_HOUR]: 'In 1 hour',
    [SNOOZE_PRESETS.TOMORROW]: 'Tomorrow, 9 AM',
    [SNOOZE_PRESETS.NEXT_WEEK]: 'Next week'
  };
  return labels[preset] || preset;
}

module.exports = {
  SNOOZE_PRESETS,
  calculateSnoozeDate,
  snoozeTask,
  getSnoozeLabel
};
