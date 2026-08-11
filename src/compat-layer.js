/**
 * Snagd Cross-Browser Compatibility Layer
 * Provides a single `browserAPI` object that resolves to
 * the native `browser` namespace on Firefox (already
 * Promise-based) or wraps Chrome's callback-based `chrome`
 * namespace in Promises to match — so the rest of the
 * codebase can call one consistent API regardless of browser.
 */

const isFirefox = typeof browser !== 'undefined' && browser.runtime;

function promisify(fn, context) {
  return (...args) => new Promise((resolve, reject) => {
    fn.call(context, ...args, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result);
      }
    });
  });
}

const browserAPI = isFirefox
  ? browser
  : {
      storage: {
        local: {
          get: promisify(chrome.storage.local.get, chrome.storage.local),
          set: promisify(chrome.storage.local.set, chrome.storage.local)
        },
        sync: {
          get: promisify(chrome.storage.sync.get, chrome.storage.sync),
          set: promisify(chrome.storage.sync.set, chrome.storage.sync)
        }
      },
      tabs: {
        query: promisify(chrome.tabs.query, chrome.tabs),
        create: promisify(chrome.tabs.create, chrome.tabs)
      },
      alarms: {
        create: (name, info) => chrome.alarms.create(name, info),
        clear: promisify(chrome.alarms.clear, chrome.alarms)
      }
    };

function getBrowserName() {
  return isFirefox ? 'firefox' : 'chrome';
}

module.exports = { browserAPI, getBrowserName };
