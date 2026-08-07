/**
 * Snagd Quick-Add Parser Module
 * Parses shorthand typed into the quick-add input into
 * a structured task — due date, priority, and tags —
 * using simple local pattern matching, no external service
 */

const PRIORITY_PATTERN = /\bp([123])\b/i;
const TAG_PATTERN = /#(\w+)/g;
const DATE_KEYWORDS = {
  'today': 0,
  'tomorrow': 1,
  'next week': 7
};

function parseQuickAdd(input) {
  let remaining = input;
  let priority = null;
  let dueDate = null;
  const tags = [];

  const priorityMatch = remaining.match(PRIORITY_PATTERN);
  if (priorityMatch) {
    priority = 'p' + priorityMatch[1];
    remaining = remaining.replace(PRIORITY_PATTERN, '');
  }

  let tagMatch;
  while ((tagMatch = TAG_PATTERN.exec(remaining)) !== null) {
    tags.push(tagMatch[1].toLowerCase());
  }
  remaining = remaining.replace(TAG_PATTERN, '');

  for (const [keyword, daysFromNow] of Object.entries(DATE_KEYWORDS)) {
    const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
    if (pattern.test(remaining)) {
      const date = new Date();
      date.setDate(date.getDate() + daysFromNow);
      dueDate = date.toISOString().split('T')[0];
      remaining = remaining.replace(pattern, '');
      break;
    }
  }

  const title = remaining.replace(/\s+/g, ' ').trim();
  return { title, priority, dueDate, tags };
}

function buildParsePreview(parsed) {
  const parts = [];
  if (parsed.dueDate) parts.push(`Due ${parsed.dueDate}`);
  if (parsed.priority) parts.push(parsed.priority.toUpperCase());
  if (parsed.tags.length) parts.push(parsed.tags.map(t => `#${t}`).join(' '));
  return parts.join(' · ');
}

module.exports = {
  parseQuickAdd,
  buildParsePreview
};
