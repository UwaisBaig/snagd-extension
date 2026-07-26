/**
 * Snagd Workspace Module
 * Saves the current set of open tabs as a
 * named workspace, and restores them later
 * as a new tab group
 */

const WORKSPACES_KEY = 'workspaces';

/**
 * Retrieves all saved workspaces
 * @returns {Promise<Array>} Array of workspace objects
 */
async function getAllWorkspaces() {
  return new Promise((resolve) => {
    chrome.storage.local.get([WORKSPACES_KEY], (result) => {
      resolve(result[WORKSPACES_KEY] || []);
    });
  });
}

/**
 * Saves the tabs in the given window as a
 * named workspace
 * @param {string} name - Workspace name
 * @param {number} windowId - Window to capture tabs from
 * @returns {Promise<Object>} The saved workspace
 */
async function saveWorkspace(name, windowId) {
  const tabs = await chrome.tabs.query({ windowId });

  const workspace = {
    id: 'ws_' + Date.now(),
    name: name.slice(0, 60),
    tabs: tabs.map(tab => ({
      title: tab.title,
      url: tab.url
    })),
    created_at: Date.now()
  };

  const workspaces = await getAllWorkspaces();
  workspaces.push(workspace);

  await new Promise((resolve) => {
    chrome.storage.local.set({ [WORKSPACES_KEY]: workspaces }, resolve);
  });

  return workspace;
}

/**
 * Restores a saved workspace by opening all
 * its tabs in a new window, grouped together
 * @param {string} workspaceId - Workspace to restore
 */
async function restoreWorkspace(workspaceId) {
  const workspaces = await getAllWorkspaces();
  const workspace = workspaces.find(w => w.id === workspaceId);
  if (!workspace || workspace.tabs.length === 0) return;

  const newWindow = await chrome.windows.create({
    url: workspace.tabs[0].url
  });

  const restTabs = workspace.tabs.slice(1);
  for (const tab of restTabs) {
    await chrome.tabs.create({
      windowId: newWindow.id,
      url: tab.url
    });
  }
}

/**
 * Deletes a saved workspace
 * @param {string} workspaceId - Workspace to delete
 */
async function deleteWorkspace(workspaceId) {
  const workspaces = await getAllWorkspaces();
  const filtered = workspaces.filter(w => w.id !== workspaceId);
  return new Promise((resolve) => {
    chrome.storage.local.set({ [WORKSPACES_KEY]: filtered }, resolve);
  });
}

module.exports = {
  getAllWorkspaces,
  saveWorkspace,
  restoreWorkspace,
  deleteWorkspace
};
