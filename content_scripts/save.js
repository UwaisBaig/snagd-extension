// Snagd — content_scripts/save.js
// Injected into all pages (<all_urls>).
// Handles the inline note input popup when "Save tab as task" is clicked.

(() => {
  // ─── Constants ─────────────────────────────────────────────────────────────
  const POPUP_ID    = "snagd-popup-root";
  const TOAST_ID    = "snagd-toast";
  const MAX_NOTE    = 120;
  const TITLE_TRUNC = 60;

  // ─── Styles (injected once, scoped with snagd- prefix) ─────────────────
  const CSS = `
    /* Outer anchor — zero footprint, just a z-index layer */
    #snagd-popup-root {
      all: unset;
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      width: 320px !important;
      z-index: 2147483647 !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      font-size: 14px !important;
      box-sizing: border-box !important;
      display: block !important;
      pointer-events: auto !important;
    }

    #snagd-popup-root * {
      box-sizing: border-box;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    #snagd-popup-inner {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.22);
      overflow: hidden;
      width: 320px;
    }

    /* Title bar */
    #snagd-titlebar {
      background: #1E3A8A;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
    }

    #snagd-titlebar-label {
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.02em;
    }

    #snagd-close-btn {
      background: none;
      border: none;
      color: #ffffff;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      padding: 0 2px;
      opacity: 0.8;
      transition: opacity 120ms ease;
    }

    #snagd-close-btn:hover {
      opacity: 1;
    }

    /* Body */
    #snagd-body {
      padding: 14px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 10px !important;
      background: #FFFFFF !important;
    }

    /* Captured title */
    #snagd-page-title {
      background: #F1F5F9 !important;
      border-radius: 6px !important;
      padding: 7px 10px !important;
      font-size: 12px !important;
      color: #334155 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      user-select: none !important;
      -webkit-text-fill-color: #334155 !important;
    }

    /* Note input */
    #snagd-note-input {
      all: unset !important;
      display: block !important;
      width: 100% !important;
      height: 64px !important;
      border: 1.5px solid #CBD5E1 !important;
      border-radius: 6px !important;
      padding: 8px 10px !important;
      font-size: 13px !important;
      font-family: system-ui, -apple-system, sans-serif !important;
      color: #0F172A !important;
      background: #FFFFFF !important;
      resize: none !important;
      outline: none !important;
      box-sizing: border-box !important;
      transition: border-color 150ms ease !important;
      -webkit-text-fill-color: #0F172A !important;
    }

    #snagd-note-input:focus {
      border-color: #1E3A8A !important;
      background: #FFFFFF !important;
    }

    #snagd-note-input::placeholder {
      color: #94A3B8 !important;
      -webkit-text-fill-color: #94A3B8 !important;
      opacity: 1 !important;
    }

    /* Char counter */
    #snagd-char-count {
      font-size: 11px;
      color: #94A3B8;
      text-align: right;
      margin-top: -6px;
    }

    #snagd-char-count.warn {
      color: #EF4444;
    }

    /* Button row */
    #snagd-btn-row {
      display: flex;
      gap: 8px;
    }

    #snagd-save-btn {
      flex: 1;
      background: #1E3A8A;
      color: #ffffff;
      border: none;
      border-radius: 7px;
      padding: 9px 0;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 120ms ease;
    }

    #snagd-save-btn:hover {
      background: #1e40af;
    }

    #snagd-cancel-btn {
      flex: 1;
      background: #F1F5F9;
      color: #334155;
      border: none;
      border-radius: 7px;
      padding: 9px 0;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      transition: background 120ms ease;
    }

    #snagd-cancel-btn:hover {
      background: #E2E8F0;
    }

    /* Due date row */
    #snagd-due-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #snagd-due-label {
      font-size: 12px !important;
      color: #64748B !important;
      white-space: nowrap !important;
      flex-shrink: 0 !important;
      -webkit-text-fill-color: #64748B !important;
    }

    #snagd-due-optional {
      opacity: 0.6;
    }

    #snagd-due-input {
      all: unset !important;
      flex: 1 !important;
      border: 1.5px solid #CBD5E1 !important;
      border-radius: 6px !important;
      padding: 5px 8px !important;
      font-size: 12px !important;
      font-family: system-ui, -apple-system, sans-serif !important;
      color: #0F172A !important;
      background: #FFFFFF !important;
      -webkit-text-fill-color: #0F172A !important;
      box-sizing: border-box !important;
      cursor: pointer !important;
    }

    #snagd-due-input:focus {
      border-color: #1E3A8A !important;
    }

    /* Toast */
    #snagd-toast {
      all: unset;
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      background: #16A34A !important;
      color: #ffffff !important;
      font-family: system-ui, -apple-system, sans-serif !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      padding: 10px 18px !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.18) !important;
      z-index: 2147483647 !important;
      opacity: 1 !important;
      display: block !important;
      pointer-events: none !important;
      transition: opacity 300ms ease !important;
    }

    #snagd-toast.fade-out {
      opacity: 0 !important;
    }
  `;

  // ─── Inject styles once ─────────────────────────────────────────────────────
  function ensureStyles() {
    if (document.getElementById("snagd-styles")) return;
    const style = document.createElement("style");
    style.id = "snagd-styles";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // ─── Remove existing popup if open ─────────────────────────────────────────
  function removePopup() {
    const existing = document.getElementById(POPUP_ID);
    if (existing) existing.remove();
  }

  // ─── Truncate helper ────────────────────────────────────────────────────────
  function truncate(str, max) {
    if (!str) return "";
    return str.length > max ? str.slice(0, max) + "…" : str;
  }

  // ─── Build and show the note popup ─────────────────────────────────────────
  function showNotePopup(capturedTitle, capturedUrl) {
    ensureStyles();
    removePopup(); // close any existing popup first

    const displayTitle = truncate(capturedTitle, TITLE_TRUNC);

    // Root wrapper
    const root = document.createElement("div");
    root.id = POPUP_ID;

    root.innerHTML = `
      <div id="snagd-popup-inner">
        <div id="snagd-titlebar">
          <span id="snagd-titlebar-label">Save as Task</span>
          <button id="snagd-close-btn" aria-label="Close">&#x2715;</button>
        </div>
        <div id="snagd-body">
          <div id="snagd-page-title" title="${escapeAttr(capturedTitle)}">${escapeHtml(displayTitle)}</div>
          <textarea
            id="snagd-note-input"
            placeholder="Add a note... (optional)"
            maxlength="${MAX_NOTE}"
            rows="3"
            aria-label="Task note"
          ></textarea>
          <div id="snagd-char-count">0 / ${MAX_NOTE}</div>
          <div id="snagd-due-row">
            <label id="snagd-due-label" for="snagd-due-input">Due date <span id="snagd-due-optional">(optional)</span></label>
            <input type="date" id="snagd-due-input" aria-label="Due date" />
          </div>
          <div id="snagd-btn-row">
            <button id="snagd-save-btn">Save Task</button>
            <button id="snagd-cancel-btn">Cancel</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    // Wire up elements
    const noteInput  = root.querySelector("#snagd-note-input");
    const charCount  = root.querySelector("#snagd-char-count");
    const saveBtn    = root.querySelector("#snagd-save-btn");
    const cancelBtn  = root.querySelector("#snagd-cancel-btn");
    const closeBtn   = root.querySelector("#snagd-close-btn");
    const dueInput   = root.querySelector("#snagd-due-input");

    // Focus the note input immediately
    noteInput.focus();

    // Live char counter
    noteInput.addEventListener("input", () => {
      const len = noteInput.value.length;
      charCount.textContent = `${len} / ${MAX_NOTE}`;
      charCount.classList.toggle("warn", len >= MAX_NOTE - 10);
    });

    // Close handlers
    cancelBtn.addEventListener("click", removePopup);
    closeBtn.addEventListener("click",  removePopup);

    // Escape key closes popup
    document.addEventListener("keydown", onEscapeKey);
    function onEscapeKey(e) {
      if (e.key === "Escape") {
        removePopup();
        document.removeEventListener("keydown", onEscapeKey);
      }
    }

    // Save handler
    saveBtn.addEventListener("click", () => {
      const note  = noteInput.value.trim() || null;
      const dueAt = dueInput.value ? new Date(dueInput.value).getTime() : null;
      saveTask(capturedTitle, capturedUrl, note, dueAt);
      removePopup();
      document.removeEventListener("keydown", onEscapeKey);
      showToast("Task saved!");
    });
  }

  // ─── Save task to chrome.storage.local ─────────────────────────────────────
  function saveTask(title, url, note, dueAt = null) {
    let faviconUrl = "";
    try {
      const hostname = new URL(url).hostname;
      faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch (_) {
      faviconUrl = "";
    }

    const task = {
      id:           "task_" + Date.now(),
      title:        title || "",
      url:          url   || "",
      favicon:      faviconUrl,
      note:         note,
      priority:     null,
      status:       "active",
      due_at:       dueAt,
      created_at:   Date.now(),
      completed_at: null
    };

    chrome.storage.local.get({ tasks: [] }, (result) => {
      const tasks = Array.isArray(result.tasks) ? result.tasks : [];
      tasks.push(task);
      chrome.storage.local.set({ tasks }, () => {
        if (chrome.runtime.lastError) {
          console.error("Snagd: storage write failed —", chrome.runtime.lastError.message);
        } else {
          console.log("Snagd: task saved →", task);
        }
      });
    });
  }

  // ─── Toast notification ─────────────────────────────────────────────────────
  function showToast(message) {
    // Remove any existing toast
    const existing = document.getElementById(TOAST_ID);
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = TOAST_ID;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Auto-dismiss after 2 seconds
    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 320);
    }, 2000);
  }

  // ─── Escape helpers ─────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return (str || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // ─── Message listener ───────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "showNotePopup") {
      showNotePopup(message.title || "", message.url || "");
      sendResponse({ status: "ok" });
    }
    return true; // keep channel open for async sendResponse
  });

})();
