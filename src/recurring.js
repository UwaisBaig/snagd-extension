/**
 * Snagd Recurring Tasks Module
 * When a task marked as recurring is completed,
 * generates the next occurrence automatically
 * instead of leaving the user to recreate it
 */

const RECURRENCE = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly'
};

function calculateNextDueDate(recurrence, fromDate) {
  const date = new Date(fromDate);
  switch (recurrence) {
    case RECURRENCE.DAILY:
      date.setDate(date.getDate() + 1);
      break;
    case RECURRENCE.WEEKLY:
      date.setDate(date.getDate() + 7);
      break;
    case RECURRENCE.MONTHLY:
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      throw new Error(`Unknown recurrence: ${recurrence}`);
  }
  return date.toISOString();
}

function generateNextOccurrence(completedTask) {
  if (!completedTask.recurrence || !completedTask.dueDate) return null;
  return {
    ...completedTask,
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
    dueDate: calculateNextDueDate(completedTask.recurrence, completedTask.dueDate),
    status: 'active',
    completed_at: null,
    created_at: Date.now(),
    parent_recurrence_id: completedTask.parent_recurrence_id || completedTask.id
  };
}

function isRecurring(task) {
  return Boolean(task.recurrence) && Object.values(RECURRENCE).includes(task.recurrence);
}

function getRecurrenceLabel(recurrence) {
  const labels = {
    [RECURRENCE.DAILY]: 'Repeats daily',
    [RECURRENCE.WEEKLY]: 'Repeats weekly',
    [RECURRENCE.MONTHLY]: 'Repeats monthly'
  };
  return labels[recurrence] || '';
}

module.exports = {
  RECURRENCE,
  calculateNextDueDate,
  generateNextOccurrence,
  isRecurring,
  getRecurrenceLabel
};
