const test = require('node:test');
const assert = require('node:assert');

test('getBrowserName - returns "chrome" when browser global is absent', () => {
  // Simulate a Chrome environment: no `browser` global defined
  global.chrome = {
    runtime: { lastError: null },
    storage: { local: { get: () => {}, set: () => {} }, sync: { get: () => {}, set: () => {} } },
    tabs: { query: () => {}, create: () => {} },
    alarms: { create: () => {}, clear: () => {} }
  };
  delete global.browser;
  delete require.cache[require.resolve('../src/compat-layer.js')];
  const { getBrowserName } = require('../src/compat-layer.js');
  assert.strictEqual(getBrowserName(), 'chrome');
});

test('promisify wrapper resolves with the callback result', async () => {
  global.chrome = {
    runtime: { lastError: null },
    storage: {
      local: {
        get: (keys, cb) => cb({ foo: 'bar' }),
        set: (items, cb) => cb()
      },
      sync: { get: (k, cb) => cb({}), set: (i, cb) => cb() }
    },
    tabs: { query: (q, cb) => cb([]), create: (o, cb) => cb({}) },
    alarms: { create: () => {}, clear: (n, cb) => cb(true) }
  };
  delete global.browser;
  delete require.cache[require.resolve('../src/compat-layer.js')];
  const { browserAPI } = require('../src/compat-layer.js');
  const result = await browserAPI.storage.local.get(['foo']);
  assert.deepStrictEqual(result, { foo: 'bar' });
});

test('promisify wrapper rejects when chrome.runtime.lastError is set', async () => {
  global.chrome = {
    runtime: { lastError: { message: 'Simulated failure' } },
    storage: {
      local: { get: (keys, cb) => cb(undefined), set: (i, cb) => cb() },
      sync: { get: (k, cb) => cb({}), set: (i, cb) => cb() }
    },
    tabs: { query: (q, cb) => cb([]), create: (o, cb) => cb({}) },
    alarms: { create: () => {}, clear: (n, cb) => cb(true) }
  };
  delete global.browser;
  delete require.cache[require.resolve('../src/compat-layer.js')];
  const { browserAPI } = require('../src/compat-layer.js');
  await assert.rejects(() => browserAPI.storage.local.get(['foo']), /Simulated failure/);
});
