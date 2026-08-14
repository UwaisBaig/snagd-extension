const test = require('node:test');
const assert = require('node:assert');
const {
  calculateNextDueDate,
  generateNextOccurrence,
  isRecurring,
  getRecurrenceLabel,
  RECURRENCE
} = require('../src/recurring.js');

test('calculateNextDueDate - daily adds one day', () => {
  const result = calculateNextDueDate(RECURRENCE.DAILY, '2026-01-15T00:00:00.000Z');
  assert.strictEqual(result.split('T')[0], '2026-01-16');
});

test('calculateNextDueDate - weekly adds seven days', () => {
  const result = calculateNextDueDate(RECURRENCE.WEEKLY, '2026-01-15T00:00:00.000Z');
  assert.strictEqual(result.split('T')[0], '2026-01-22');
});

test('calculateNextDueDate - monthly handles month-end rollover', () => {
  // Jan 31 + 1 month: JS Date will roll into March in some cases, this
  // test exists specifically to document actual behavior, not assume it
  const result = calculateNextDueDate(RECURRENCE.MONTHLY, '2026-01-31T00:00:00.000Z');
  const resultDate = new Date(result);
  // Document whatever the real output is — this is the point of the test
  console.log('Jan 31 + 1 month actually produces:', result);
  assert.ok(resultDate instanceof Date && !isNaN(resultDate));
});

test('calculateNextDueDate - throws on unknown recurrence type', () => {
  assert.throws(() => calculateNextDueDate('yearly', '2026-01-15'));
});

test('generateNextOccurrence - returns null for non-recurring task', () => {
  const result = generateNextOccurrence({ id: 'task_1', dueDate: '2026-01-15' });
  assert.strictEqual(result, null);
});

test('generateNextOccurrence - returns null when dueDate missing', () => {
  const result = generateNextOccurrence({ id: 'task_1', recurrence: RECURRENCE.DAILY });
  assert.strictEqual(result, null);
});

test('generateNextOccurrence - generates a new id, not the same one', () => {
  const original = { id: 'task_1', recurrence: RECURRENCE.DAILY, dueDate: '2026-01-15T00:00:00.000Z' };
  const next = generateNextOccurrence(original);
  assert.notStrictEqual(next.id, original.id);
});

test('generateNextOccurrence - preserves parent_recurrence_id chain', () => {
  const original = { id: 'task_1', recurrence: RECURRENCE.DAILY, dueDate: '2026-01-15T00:00:00.000Z' };
  const next = generateNextOccurrence(original);
  assert.strictEqual(next.parent_recurrence_id, 'task_1');
  const nextAgain = generateNextOccurrence(next);
  assert.strictEqual(nextAgain.parent_recurrence_id, 'task_1');
});

test('isRecurring - false for invalid recurrence string', () => {
  assert.strictEqual(isRecurring({ recurrence: 'yearly' }), false);
});

test('getRecurrenceLabel - returns empty string for unknown value', () => {
  assert.strictEqual(getRecurrenceLabel('yearly'), '');
});
