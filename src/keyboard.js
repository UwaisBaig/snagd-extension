/**
 * Snagd Keyboard Shortcut Module
 * Registers and handles the quick-save
 * command defined in manifest.json
 */

const SAVE_SHORTCUT_COMMAND = 'save-active-tab';

/**
 * Registers the command listener.
 * Call once from the background service worker.
 */
function initKeyboardShortcuts() {
  chrome.commands.onCommand.addListener((command) => {
    if (command === SAVE_SHORTCUT_COMMAND) {
      handleQuickSave();
    }
  });
}

/**
 * Grabs the active tab in the current window
 * and triggers the save-as-task flow.
 */
async function handleQuickSave() {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!activeTab) return;

  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#0D9488' });

  // Signal the popup/background save pipeline
  chrome.runtime.sendMessage({
    type: 'QUICK_SAVE_TAB',
    tab: {
      title: activeTab.title,
      url: activeTab.url
    }
  });

  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 1500);
}

module.exports = { initKeyboardShortcuts, handleQuickSave };
