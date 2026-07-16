/*
 * Snagd — background.js (Service Worker)
 *
 * chrome.storage.local DATA SCHEMA
 * Each saved task is stored as an object with the following shape:
 *
 * {
 *   id:           string        — UUID generated at save time, e.g. "task_1720000000000"
 *   title:        string        — Page title auto-captured from the tab
 *   url:          string        — Full URL of the saved tab
 *   favicon:      string        — Favicon URL for display in task list
 *   note:         string|null   — Optional one-line note added by user at save time (max 120 chars)
 *   priority:     string|null   — "p1" | "p2" | "p3" | null  (default: null)
 *   status:       string        — "active" | "completed"      (default: "active")
 *   due_at:       number|null   — Unix timestamp of due date, else null (default: null)
 *   created_at:   number        — Unix timestamp (Date.now()) at save time
 *   completed_at: number|null   — Unix timestamp when marked complete, else null
 * }
 *
 * Stored under the key "tasks" as an array:
 *   chrome.storage.local.set({ tasks: [ ...taskObjects ] })
 *   chrome.storage.local.get("tasks", ({ tasks }) => { ... })
 *
 * chrome.storage.sync SETTINGS SCHEMA:
 * {
 *   nudgeEnabled:   boolean — default: true
 *   nudgeDay:       string  — "monday"–"sunday", default: "monday"
 *   nudgeHour:      number  — 0–23, default: 9
 *   nudgeThreshold: number  — 3 | 5 | 10, default: 5
 *   theme:          string  — "light" | "dark" | "auto", default: "auto"
 * }
 */

// ─── Default settings ────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  nudgeEnabled:   true,
  nudgeDay:       'monday',
  nudgeHour:      9,
  nudgeThreshold: 5,
  theme:          'auto'
};

// Day name → weekday index (0 = Sunday)
const DAY_INDEX = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6
};

// ─── Install: register context menu + schedule initial alarm ─────────────────
chrome.runtime.onInstalled.addListener(() => {
  console.log('Snagd installed');

  chrome.contextMenus.create({
    id: 'saveAsTask',
    title: 'Save tab as task',
    contexts: ['page', 'link']
  });

  // Schedule the weekly nudge alarm on install
  scheduleNudgeAlarm();
});

// ─── On startup: reschedule alarm (service worker may have been killed) ───────
chrome.runtime.onStartup.addListener(() => {
  scheduleNudgeAlarm();
});

// ─── Listen for settings changes to reschedule alarm ─────────────────────────
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    const settingsKeys = ['nudgeEnabled', 'nudgeDay', 'nudgeHour', 'nudgeThreshold'];
    if (settingsKeys.some(k => k in changes)) {
      scheduleNudgeAlarm();
    }
  }
});

// ─── Schedule weekly nudge alarm ─────────────────────────────────────────────
function scheduleNudgeAlarm() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    // Clear any existing alarm first
    chrome.alarms.clear('weeklyNudge', () => {
      if (!settings.nudgeEnabled) {
        console.log('Snagd: nudge disabled — alarm cleared');
        return;
      }

      const targetDay  = DAY_INDEX[settings.nudgeDay] ?? 1; // default Monday
      const targetHour = settings.nudgeHour ?? 9;

      const now     = new Date();
      const next    = new Date();
      next.setHours(targetHour, 0, 0, 0);

      // Advance to the correct day of the week
      const currentDay = now.getDay();
      let daysUntil    = (targetDay - currentDay + 7) % 7;

      // If today is the right day but the hour has already passed, schedule for next week
      if (daysUntil === 0 && now >= next) {
        daysUntil = 7;
      }

      next.setDate(next.getDate() + daysUntil);

      const delayMs      = next.getTime() - Date.now();
      const periodMs     = 7 * 24 * 60 * 60 * 1000; // exactly 1 week
      const delayMinutes = delayMs / 60000;

      chrome.alarms.create('weeklyNudge', {
        delayInMinutes: delayMinutes,
        periodInMinutes: periodMs / 60000
      });

      console.log(`Snagd: nudge alarm set for ${next.toLocaleString()} (in ${Math.round(delayMinutes / 60)} hours)`);
    });
  });
}

// ─── Alarm fired ─────────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'weeklyNudge') return;

  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    if (!settings.nudgeEnabled) return;

    chrome.storage.local.get({ tasks: [] }, (result) => {
      const tasks       = Array.isArray(result.tasks) ? result.tasks : [];
      const activeCount = tasks.filter(t => t.status === 'active').length;

      if (activeCount < settings.nudgeThreshold) {
        console.log(`Snagd: nudge skipped — only ${activeCount} active tasks (threshold: ${settings.nudgeThreshold})`);
        return;
      }

      chrome.notifications.create('weeklyNudge', {
        type:    'basic',
        iconUrl: '../icons/icon128.png',
        title:   'Snagd',
        message: `You have ${activeCount} unfinished tab tasks this week. Ready to clear them?`,
        priority: 1
      });
    });
  });
});

// ─── Notification click: open popup ──────────────────────────────────────────
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'weeklyNudge') {
    chrome.action.openPopup().catch(() => {
      // openPopup() only works when a browser window is focused.
      // Fallback: open a new tab pointing to the popup HTML.
      chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
    });
    chrome.notifications.clear('weeklyNudge');
  }
});

// ─── Context menu click handler ──────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'saveAsTask') return;

  // info.linkUrl is only populated when the user right-clicked a link
  if (info.linkUrl) {
    const linkUrl   = info.linkUrl;
    // linkText is the visible anchor text (Chrome 95+); fall back to the URL
    const linkTitle = info.linkText || linkUrl;
    sendNotePopupMessage(tab.id, linkTitle, linkUrl);
  } else {
    // Right-clicked on the page body — use the tab's own title + URL
    // tab object is already the correct tab; no need for tabs.query
    const title = tab.title || '';
    const url   = tab.url   || '';
    sendNotePopupMessage(tab.id, title, url);
  }
});

// ─── Helper: send message to content script ──────────────────────────────────
function sendNotePopupMessage(tabId, title, url) {
  chrome.tabs.sendMessage(tabId, {
    action: 'showNotePopup',
    title,
    url
  }, () => {
    if (chrome.runtime.lastError) {
      console.warn('Snagd: could not reach content script —', chrome.runtime.lastError.message);
    }
  });
}

// ─── Message handler (from popup or settings) ─────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'rescheduleAlarm') {
    scheduleNudgeAlarm();
    sendResponse({ status: 'ok' });
  }
  if (message.action === 'triggerNudgeTest') {
    // Dev helper: manually fire the nudge notification for testing
    chrome.alarms.onAlarm.dispatch({ name: 'weeklyNudge' });
    sendResponse({ status: 'triggered' });
  }
  return true;
});

// ─── Keyboard Shortcut Command Listener ──────────────────────────────────────
chrome.commands.onCommand.addListener((command) => {
  if (command === 'snag-tab') {
    snagActiveTab();
  }
});

function snagActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) return;
    const activeTab = tabs[0];
    
    // Ignore internal pages
    if (!activeTab.url || activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
      return;
    }

    chrome.storage.local.get({ tasks: [] }, (result) => {
      const tasks = Array.isArray(result.tasks) ? result.tasks : [];
      const exists = tasks.some(t => t.url === activeTab.url && t.status === 'active');
      if (exists) {
        chrome.notifications.create('snagDuplicate', {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Already Snagged',
          message: 'This page is already in your active tasks.',
          priority: 1
        });
        return;
      }

      const newTask = {
        id: 'task_' + Date.now(),
        title: activeTab.title || 'Untitled',
        url: activeTab.url,
        favicon: activeTab.favIconUrl || '',
        note: null,
        priority: 'none',
        status: 'active',
        due_at: null,
        created_at: Date.now(),
        completed_at: null
      };

      tasks.push(newTask);
      chrome.storage.local.set({ tasks }, () => {
        chrome.notifications.create('snaggedSuccess', {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Tab Snagged!',
          message: `"${newTask.title}" has been added to your Inbox.`,
          priority: 1
        });
      });
    });
  });
}

// ─── Badge count — update toolbar icon badge whenever tasks change ────────────
function updateBadgeCount() {
  chrome.storage.local.get({ tasks: [] }, (result) => {
    const tasks  = Array.isArray(result.tasks) ? result.tasks : [];
    const active = tasks.filter(t => t.status === 'active').length;
    const overdue = tasks.filter(t =>
      t.status === 'active' && t.due_at && t.due_at < Date.now()
    ).length;

    if (active === 0) {
      chrome.action.setBadgeText({ text: '' });
    } else {
      chrome.action.setBadgeText({ text: String(active) });
      // Red badge if any tasks are overdue, teal otherwise
      chrome.action.setBadgeBackgroundColor({
        color: overdue > 0 ? '#DC2626' : '#0D9488'
      });
    }
  });
}

// Run on install/startup
chrome.runtime.onInstalled.addListener(() => { updateBadgeCount(); });
chrome.runtime.onStartup.addListener(()    => { updateBadgeCount(); });

// Run whenever local storage changes (tasks saved, completed, deleted)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.tasks) {
    updateBadgeCount();
  }
});
