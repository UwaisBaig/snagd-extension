# Snagd

A Chrome Extension that converts any browser tab into an actionable task with one right-click.

## Features

- Right-click any tab or link to save it as a task
- Clean popup dashboard to manage all saved tasks
- Search and filter tasks
- Priority tags (P1/P2/P3)
- Weekly nudge notification for unfinished tasks
- Export tasks to JSON or CSV
- Works on Chrome, Edge, and Brave

## Roadmap

- [x] One-click save via right-click menu
- [x] Keyboard shortcut (Cmd/Ctrl+Shift+S)
- [x] Projects — group tasks by project
- [x] Activity log — full history of task events
- [x] Per-task due-date reminders
- [x] Light / Dark / Auto theme
- [x] Workspace save & restore (tab groups)
- [x] GitHub Gist cloud sync
- [x] JSON/CSV import
- [x] Task snooze
- [x] Bulk actions (multi-select complete/delete/move)
- [x] Auto-archive old completed tasks
- [x] Link preview enrichment (clean titles, favicons)
- [x] Recurring tasks
- [x] Checklist-style subtasks
- [x] Free-form tags
- [x] Natural shorthand quick-add parsing
- [x] Productivity stats and streaks
- [x] Firefox / Edge compatibility layer
- [ ] Mobile companion view

## Architecture

Snagd is built entirely on Chrome Extensions
Manifest V3, no backend, no account required:

src/
├── storage.js          # chrome.storage CRUD operations
├── task.js             # Task model and due date logic
├── badge.js            # Toolbar badge management
├── search.js           # Real-time search and filtering
├── nudge.js            # Weekly alarm notifications
├── export.js           # JSON and CSV export
├── keyboard.js          # Keyboard shortcut handling
├── projects.js          # Project grouping
├── activity.js          # Activity/event log
├── reminders.js         # Per-task due-date reminders
├── theme.js              # Light/Dark/Auto theme switching
├── workspace.js          # Save/restore tab workspaces
├── gist-sync.js           # GitHub Gist backup and restore
├── import.js               # JSON/CSV import with merging
├── snooze.js                # Preset due-date postponing
├── bulk-actions.js           # Multi-select bulk operations
├── archive.js                 # Auto-archive old completed tasks
├── link-preview.js             # Clean titles and favicon enrichment
├── recurring.js                 # Auto-generated recurring task occurrences
├── subtasks.js                  # Checklist-style subtasks within tasks
├── tags.js                      # Free-form multi-tag labels
├── quick-add-parser.js          # Natural shorthand quick-add parsing
├── stats.js                     # Completion rates and streak statistics
└── compat-layer.js              # Cross-browser compatibility layer (Firefox/Edge)

## Tech Stack

- JavaScript (vanilla, no frameworks)
- Chrome Extensions API (Manifest V3)
- chrome.storage.local (no backend, no account needed)
- chrome.alarms + chrome.notifications

## Installation (Development)

1. Clone this repo
2. Go to chrome://extensions
3. Enable Developer mode
4. Click Load unpacked
5. Select the tabtotask/ folder

## Status

Currently in active development.

## Developer

M. Uwais Baig  
uwaisbaig.netlify.app
