// Snagd — settings.js
// Reads and writes user settings to chrome.storage.sync.
// Opens as a full tab via chrome.tabs.create from the popup.

(() => {
  'use strict';

  // ─── Default settings ──────────────────────────────────────────────────────
  const DEFAULTS = {
    nudgeEnabled:   true,
    nudgeDay:       'monday',
    nudgeHour:      9,
    nudgeThreshold: 5,
    theme:          'auto',
    githubPat:      '',
    gistId:         ''
  };

  // ─── DOM refs ───────────────────────────────────────────────────────────────
  const nudgeEnabledEl    = document.getElementById('nudgeEnabled');
  const nudgeDayEl        = document.getElementById('nudgeDay');
  const nudgeHourEl       = document.getElementById('nudgeHour');
  const nudgeThresholdEl  = document.getElementById('nudgeThreshold');
  const nudgeOptions      = document.getElementById('nudge-options');
  const nudgeHourRow      = document.getElementById('nudge-hour-row');
  const nudgeThresholdRow = document.getElementById('nudge-threshold-row');
  const saveBtn           = document.getElementById('st-save-btn');
  const saveMsg           = document.getElementById('st-save-msg');
  const exportJsonBtn     = document.getElementById('exportJson');
  const exportCsvBtn      = document.getElementById('exportCsv');
  const clearCompletedBtn = document.getElementById('clearCompleted');

  // Gist Sync Refs
  const githubPatEl   = document.getElementById('githubPat');
  const gistIdEl      = document.getElementById('gistId');
  const syncBackupBtn = document.getElementById('syncBackup');
  const syncRestoreBtn= document.getElementById('syncRestore');

  // ─── Populate hour select ───────────────────────────────────────────────────
  function populateHours() {
    for (let h = 0; h < 24; h++) {
      const opt = document.createElement('option');
      opt.value = h;
      const period = h < 12 ? 'AM' : 'PM';
      const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
      opt.textContent = `${display}:00 ${period}`;
      nudgeHourEl.appendChild(opt);
    }
  }

  // ─── Apply theme to page ────────────────────────────────────────────────────
  function applyTheme(theme) {
    document.body.classList.remove('theme-auto');
    document.body.removeAttribute('data-theme');

    if (theme === 'dark') {
      document.body.setAttribute('data-theme', 'dark');
    } else if (theme === 'auto') {
      document.body.classList.add('theme-auto');
    }
  }

  // ─── Load settings into form ────────────────────────────────────────────────
  function loadSettings() {
    chrome.storage.sync.get(DEFAULTS, (settings) => {
      nudgeEnabledEl.checked       = settings.nudgeEnabled;
      nudgeDayEl.value             = settings.nudgeDay;
      nudgeHourEl.value            = settings.nudgeHour;
      nudgeThresholdEl.value       = settings.nudgeThreshold;
      
      githubPatEl.value            = settings.githubPat || '';
      gistIdEl.value               = settings.gistId || '';

      const themeRadio = document.querySelector(`input[name="theme"][value="${settings.theme}"]`);
      if (themeRadio) themeRadio.checked = true;

      applyTheme(settings.theme);
      updateNudgeOptionsState(settings.nudgeEnabled);
    });
  }

  // ─── Enable/disable nudge sub-options ──────────────────────────────────────
  function updateNudgeOptionsState(enabled) {
    nudgeOptions.classList.toggle('disabled', !enabled);
    nudgeHourRow.classList.toggle('disabled', !enabled);
    nudgeThresholdRow.classList.toggle('disabled', !enabled);
  }

  // ─── Save settings ──────────────────────────────────────────────────────────
  function saveSettings() {
    const selectedTheme = document.querySelector('input[name="theme"]:checked');

    const settings = {
      nudgeEnabled:   nudgeEnabledEl.checked,
      nudgeDay:       nudgeDayEl.value,
      nudgeHour:      parseInt(nudgeHourEl.value, 10),
      nudgeThreshold: parseInt(nudgeThresholdEl.value, 10),
      theme:          selectedTheme ? selectedTheme.value : 'auto',
      githubPat:      githubPatEl.value.trim(),
      gistId:         gistIdEl.value.trim()
    };

    chrome.storage.sync.set(settings, () => {
      if (chrome.runtime.lastError) {
        console.error('Snagd: settings save failed —', chrome.runtime.lastError.message);
        return;
      }

      chrome.runtime.sendMessage({ action: 'rescheduleAlarm' });
      applyTheme(settings.theme);

      saveMsg.textContent = 'Settings saved!';
      saveMsg.hidden = false;
      setTimeout(() => { saveMsg.hidden = true; }, 2500);
    });
  }

  // ─── GitHub Gist Sync Actions ───────────────────────────────────────────────
  async function performGistBackup() {
    const pat = githubPatEl.value.trim();
    let gistId = gistIdEl.value.trim();

    if (!pat) {
      alert('Please enter a GitHub Personal Access Token (PAT) first.');
      return;
    }

    syncBackupBtn.disabled = true;
    syncBackupBtn.textContent = 'Backing up...';

    try {
      const { tasks } = await new Promise((res) => chrome.storage.local.get({ tasks: [] }, res));
      const fileContent = JSON.stringify(tasks, null, 2);
      
      const payload = {
        description: 'Snagd Task Manager Backup',
        files: {
          'snagd_backup.json': {
            content: fileContent
          }
        }
      };

      let response;
      if (gistId) {
        response = await fetch(`https://api.github.com/gists/${gistId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${pat}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } else {
        payload.public = false;
        response = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: {
            'Authorization': `token ${pat}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      if (!gistId && responseData.id) {
        gistId = responseData.id;
        gistIdEl.value = gistId;
        chrome.storage.sync.set({ gistId });
      }

      alert('Backup completed successfully!');
    } catch (err) {
      console.error(err);
      alert(`Backup failed: ${err.message}`);
    } finally {
      syncBackupBtn.disabled = false;
      syncBackupBtn.textContent = 'Backup to Gist';
    }
  }

  async function performGistRestore() {
    const pat = githubPatEl.value.trim();
    const gistId = gistIdEl.value.trim();

    if (!pat || !gistId) {
      alert('Both GitHub PAT and Gist ID are required to perform a restore.');
      return;
    }

    const confirmed = window.confirm('Restoring will overwrite all current local tasks. Do you want to proceed?');
    if (!confirmed) return;

    syncRestoreBtn.disabled = true;
    syncRestoreBtn.textContent = 'Restoring...';

    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${pat}`
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      const backupFile = responseData.files && responseData.files['snagd_backup.json'];
      
      if (!backupFile) {
        throw new Error("No backup file named 'snagd_backup.json' found in this Gist.");
      }

      const parsedTasks = JSON.parse(backupFile.content);
      if (!Array.isArray(parsedTasks)) {
        throw new Error("Backup file contents are invalid (not a list of tasks).");
      }

      await new Promise((res) => chrome.storage.local.set({ tasks: parsedTasks }, res));
      alert(`Restored ${parsedTasks.length} tasks from GitHub backup!`);
    } catch (err) {
      console.error(err);
      alert(`Restore failed: ${err.message}`);
    } finally {
      syncRestoreBtn.disabled = false;
      syncRestoreBtn.textContent = 'Restore from Gist';
    }
  }

  // ─── Export helpers ─────────────────────────────────────────────────────────
  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportJson() {
    chrome.storage.local.get({ tasks: [] }, ({ tasks }) => {
      const json     = JSON.stringify(tasks, null, 2);
      const filename = `snagd-export-${dateStamp()}.json`;
      downloadFile(filename, json, 'application/json');
    });
  }

  function exportCsv() {
    chrome.storage.local.get({ tasks: [] }, ({ tasks }) => {
      if (tasks.length === 0) {
        alert('No tasks to export.');
        return;
      }

      const headers = ['id', 'title', 'url', 'note', 'priority', 'status', 'created_at', 'completed_at'];
      const rows = tasks.map(t =>
        headers.map(h => {
          const val = t[h] == null ? '' : String(t[h]);
          return /[",\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',')
      );

      const csv      = [headers.join(','), ...rows].join('\n');
      const filename = `snagd-export-${dateStamp()}.csv`;
      downloadFile(filename, csv, 'text/csv');
    });
  }

  function dateStamp() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  // ─── Clear completed ────────────────────────────────────────────────────────
  function clearCompleted() {
    const confirmed = window.confirm('Delete all completed tasks? This cannot be undone.');
    if (!confirmed) return;

    chrome.storage.local.get({ tasks: [] }, ({ tasks }) => {
      const remaining = tasks.filter(t => t.status === 'active');
      chrome.storage.local.set({ tasks: remaining }, () => {
        const removed = tasks.length - remaining.length;
        saveMsg.textContent = `Cleared ${removed} completed task${removed !== 1 ? 's' : ''}.`;
        saveMsg.hidden = false;
        setTimeout(() => { saveMsg.hidden = true; }, 2500);
      });
    });
  }

  // ─── Wire up events ─────────────────────────────────────────────────────────
  nudgeEnabledEl.addEventListener('change', () => {
    updateNudgeOptionsState(nudgeEnabledEl.checked);
  });

  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) applyTheme(radio.value);
    });
  });

  saveBtn.addEventListener('click', saveSettings);
  exportJsonBtn.addEventListener('click', exportJson);
  exportCsvBtn.addEventListener('click', exportCsv);
  clearCompletedBtn.addEventListener('click', clearCompleted);

  // Sync actions
  syncBackupBtn.addEventListener('click', performGistBackup);
  syncRestoreBtn.addEventListener('click', performGistRestore);

  const privacyLink = document.getElementById('st-privacy-link');
  if (privacyLink) {
    privacyLink.href = chrome.runtime.getURL('privacy.html');
  }

  // ─── Boot ───────────────────────────────────────────────────────────────────
  populateHours();
  loadSettings();

})();
