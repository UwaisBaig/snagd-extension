/**
 * Snagd Tags Module
 * Free-form, multi-value labels on tasks, separate
 * from the single-value Projects grouping
 */

const MAX_TAG_LENGTH = 24;

function normalizeTag(rawTag) {
  return rawTag
    .trim()
    .replace(/^#/, '')
    .toLowerCase()
    .slice(0, MAX_TAG_LENGTH);
}

function addTag(task, rawTag) {
  const tag = normalizeTag(rawTag);
  if (!tag) return task;
  const tags = task.tags || [];
  if (tags.includes(tag)) return task;
  return { ...task, tags: [...tags, tag] };
}

function removeTag(task, tag) {
  const tags = (task.tags || []).filter(t => t !== normalizeTag(tag));
  return { ...task, tags };
}

function filterByTag(tasks, tag) {
  const normalized = normalizeTag(tag);
  return tasks.filter(task => (task.tags || []).includes(normalized));
}

function getAllTagsWithCounts(tasks) {
  const counts = {};
  tasks.forEach(task => {
    (task.tags || []).forEach(tag => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

module.exports = {
  normalizeTag,
  addTag,
  removeTag,
  filterByTag,
  getAllTagsWithCounts
};
