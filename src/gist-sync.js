/**
 * Snagd Gist Sync Module
 * Backs up all local tasks to a private GitHub Gist,
 * and restores them from a Gist ID. Requires a GitHub
 * Personal Access Token with 'gist' scope, provided by
 * the user in Settings — never transmitted anywhere but
 * directly to api.github.com.
 */

const GIST_API = 'https://api.github.com/gists';
const GIST_FILENAME = 'snagd-backup.json';
const PAT_KEY = 'github_pat';
const GIST_ID_KEY = 'gist_id';

/**
 * Retrieves the saved GitHub PAT and Gist ID, if any
 * @returns {Promise<{pat: string|null, gistId: string|null}>}
 */
async function getSyncCredentials() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([PAT_KEY, GIST_ID_KEY], (result) => {
      resolve({
        pat: result[PAT_KEY] || null,
        gistId: result[GIST_ID_KEY] || null
      });
    });
  });
}

/**
 * Saves the GitHub PAT and optional existing Gist ID
 * @param {string} pat - GitHub Personal Access Token
 * @param {string|null} gistId - Existing Gist ID, if any
 */
async function saveSyncCredentials(pat, gistId = null) {
  return new Promise((resolve) => {
    const data = { [PAT_KEY]: pat };
    if (gistId) data[GIST_ID_KEY] = gistId;
    chrome.storage.sync.set(data, resolve);
  });
}

/**
 * Backs up all tasks to a Gist. Creates a new private
 * Gist on first sync, updates the existing one after.
 * @param {Array} tasks - All tasks to back up
 * @returns {Promise<string>} The Gist ID used
 */
async function backupToGist(tasks) {
  const { pat, gistId } = await getSyncCredentials();
  if (!pat) throw new Error('No GitHub token configured');

  const body = {
    description: 'Snagd task backup',
    public: false,
    files: {
      [GIST_FILENAME]: {
        content: JSON.stringify({ backed_up_at: new Date().toISOString(), tasks }, null, 2)
      }
    }
  };

  const url = gistId ? `${GIST_API}/${gistId}` : GIST_API;
  const method = gistId ? 'PATCH' : 'POST';

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `token ${pat}`,
      'Accept': 'application/vnd.github+json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error(`Gist backup failed: ${response.status}`);

  const result = await response.json();
  await saveSyncCredentials(pat, result.id);
  return result.id;
}

/**
 * Restores tasks from a previously saved Gist
 * @returns {Promise<Array>} The restored tasks array
 */
async function restoreFromGist() {
  const { pat, gistId } = await getSyncCredentials();
  if (!pat || !gistId) throw new Error('No Gist configured to restore from');

  const response = await fetch(`${GIST_API}/${gistId}`, {
    headers: {
      'Authorization': `token ${pat}`,
      'Accept': 'application/vnd.github+json'
    }
  });

  if (!response.ok) throw new Error(`Gist restore failed: ${response.status}`);

  const gist = await response.json();
  const file = gist.files[GIST_FILENAME];
  if (!file) throw new Error('Backup file not found in Gist');

  const parsed = JSON.parse(file.content);
  return parsed.tasks || [];
}

module.exports = {
  getSyncCredentials,
  saveSyncCredentials,
  backupToGist,
  restoreFromGist
};
