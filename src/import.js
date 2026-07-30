/**
 * Snagd Import Module
 * Imports tasks from a JSON or CSV file previously
 * created by export.js, merging with existing tasks
 */

/**
 * Parses an imported JSON backup file's content
 * @param {string} jsonText - Raw file content
 * @returns {Array} Parsed task objects
 */
function parseImportedJSON(jsonText) {
  const data = JSON.parse(jsonText);
  if (!data.tasks || !Array.isArray(data.tasks)) {
    throw new Error('Invalid backup file: missing tasks array');
  }
  return data.tasks;
}

/**
 * Parses an imported CSV file's content back into tasks
 * @param {string} csvText - Raw CSV file content
 * @returns {Array} Parsed task objects
 */
function parseImportedCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const [, ...rows] = lines; // skip header row

  return rows.map(line => {
    const cols = splitCSVLine(line);
    const [title, url, note, dueDate, priority, status] = cols;
    return {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
      title,
      url,
      note: note || null,
      dueDate: dueDate || null,
      priority: priority || null,
      status: status || 'active',
      created_at: Date.now(),
      completed_at: null
    };
  });
}

/**
 * Splits a single CSV line respecting quoted fields
 * @param {string} line - One CSV row
 * @returns {Array<string>} Field values
 */
function splitCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map(f => f.replace(/^"|"$/g, ''));
}

/**
 * Merges imported tasks with existing tasks, skipping
 * duplicates by matching title + url
 * @param {Array} existingTasks - Current tasks
 * @param {Array} importedTasks - Newly imported tasks
 * @returns {Array} Merged task list
 */
function mergeImportedTasks(existingTasks, importedTasks) {
  const existingKeys = new Set(
    existingTasks.map(t => `${t.title}|${t.url}`)
  );

  const newTasks = importedTasks.filter(
    t => !existingKeys.has(`${t.title}|${t.url}`)
  );

  return [...existingTasks, ...newTasks];
}

module.exports = {
  parseImportedJSON,
  parseImportedCSV,
  mergeImportedTasks
};
