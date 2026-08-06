/**
 * Snagd Subtasks Module
 * Manages a checklist of subtasks nested within
 * a single parent task
 */

function createSubtask(text) {
  return {
    id: 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    text: text.slice(0, 140),
    done: false,
    created_at: Date.now()
  };
}

function addSubtask(task, text) {
  const subtasks = task.subtasks || [];
  return { ...task, subtasks: [...subtasks, createSubtask(text)] };
}

function toggleSubtask(task, subtaskId) {
  const subtasks = (task.subtasks || []).map(sub =>
    sub.id === subtaskId ? { ...sub, done: !sub.done } : sub
  );
  return { ...task, subtasks };
}

function removeSubtask(task, subtaskId) {
  const subtasks = (task.subtasks || []).filter(sub => sub.id !== subtaskId);
  return { ...task, subtasks };
}

function getSubtaskProgress(task) {
  const subtasks = task.subtasks || [];
  if (subtasks.length === 0) return 0;
  const doneCount = subtasks.filter(sub => sub.done).length;
  return Math.round((doneCount / subtasks.length) * 100);
}

module.exports = {
  createSubtask,
  addSubtask,
  toggleSubtask,
  removeSubtask,
  getSubtaskProgress
};
