const test = require('node:test');
const assert = require('node:assert');
const { parseQuickAdd, buildParsePreview } = require('../src/quick-add-parser.js');

test('parses priority, tag, and date keyword together', () => {
  const result = parseQuickAdd('Buy milk tomorrow p1 #errands');
  assert.strictEqual(result.priority, 'p1');
  assert.deepStrictEqual(result.tags, ['errands']);
  assert.ok(result.dueDate);
  assert.strictEqual(result.title, 'Buy milk');
});

test('handles input with no shorthand at all', () => {
  const result = parseQuickAdd('Just a plain task title');
  assert.strictEqual(result.priority, null);
  assert.strictEqual(result.dueDate, null);
  assert.deepStrictEqual(result.tags, []);
  assert.strictEqual(result.title, 'Just a plain task title');
});

test('handles multiple tags in one input', () => {
  const result = parseQuickAdd('Fix bug #urgent #backend #api');
  assert.deepStrictEqual(result.tags, ['urgent', 'backend', 'api']);
});

test('priority pattern does not false-match inside a word', () => {
  // "p1" should not match words like "app1" or "top10"
  const result = parseQuickAdd('Update app1 configuration');
  assert.strictEqual(result.priority, null);
});

test('handles "next week" as a two-word date keyword', () => {
  const result = parseQuickAdd('Submit report next week');
  assert.ok(result.dueDate);
  assert.strictEqual(result.title, 'Submit report');
});

test('empty string input does not throw', () => {
  assert.doesNotThrow(() => parseQuickAdd(''));
  const result = parseQuickAdd('');
  assert.strictEqual(result.title, '');
});

test('buildParsePreview formats all fields correctly', () => {
  const parsed = { dueDate: '2026-01-16', priority: 'p1', tags: ['errands'] };
  const preview = buildParsePreview(parsed);
  assert.ok(preview.includes('Due 2026-01-16'));
  assert.ok(preview.includes('P1'));
  assert.ok(preview.includes('#errands'));
});

test('buildParsePreview handles empty parsed result', () => {
  const preview = buildParsePreview({ dueDate: null, priority: null, tags: [] });
  assert.strictEqual(preview, '');
});
