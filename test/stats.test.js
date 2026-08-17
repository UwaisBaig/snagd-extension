const test = require('node:test');
const assert = require('node:assert');
const {
  getCompletionRate,
  getActiveDays,
  getCurrentStreak,
  getBestStreak
} = require('../src/stats.js');

test('getCompletionRate - returns 0 for empty task list', () => {
  assert.strictEqual(getCompletionRate([]), 0);
});

test('getCompletionRate - calculates correct percentage', () => {
  const now = Date.now();
  const tasks = [
    { created_at: now, status: 'completed' },
    { created_at: now, status: 'completed' },
    { created_at: now, status: 'active' },
    { created_at: now, status: 'active' }
  ];
  assert.strictEqual(getCompletionRate(tasks), 50);
});

test('getCompletionRate - excludes tasks outside the time window', () => {
  const now = Date.now();
  const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
  const tasks = [
    { created_at: now, status: 'completed' },
    { created_at: twoWeeksAgo, status: 'active' } // outside 7-day window
  ];
  assert.strictEqual(getCompletionRate(tasks, 7), 100);
});

test('getActiveDays - deduplicates multiple completions on the same day', () => {
  const sameDay = new Date('2026-01-15T10:00:00.000Z').getTime();
  const sameDayLater = new Date('2026-01-15T18:00:00.000Z').getTime();
  const tasks = [
    { status: 'completed', completed_at: sameDay },
    { status: 'completed', completed_at: sameDayLater }
  ];
  const days = getActiveDays(tasks);
  assert.strictEqual(days.size, 1);
});

test('getActiveDays - ignores tasks without completed_at', () => {
  const tasks = [{ status: 'completed', completed_at: null }];
  const days = getActiveDays(tasks);
  assert.strictEqual(days.size, 0);
});

test('getCurrentStreak - returns 0 with no active days', () => {
  assert.strictEqual(getCurrentStreak([]), 0);
});

test('getBestStreak - returns 0 for empty task list', () => {
  assert.strictEqual(getBestStreak([]), 0);
});

test('getBestStreak - correctly identifies a 3-day consecutive streak', () => {
  const day1 = new Date('2026-01-13T12:00:00.000Z').getTime();
  const day2 = new Date('2026-01-14T12:00:00.000Z').getTime();
  const day3 = new Date('2026-01-15T12:00:00.000Z').getTime();
  const tasks = [
    { status: 'completed', completed_at: day1 },
    { status: 'completed', completed_at: day2 },
    { status: 'completed', completed_at: day3 }
  ];
  assert.strictEqual(getBestStreak(tasks), 3);
});

test('getBestStreak - a gap in days breaks the streak correctly', () => {
  const day1 = new Date('2026-01-13T12:00:00.000Z').getTime();
  const day2 = new Date('2026-01-14T12:00:00.000Z').getTime();
  const day5 = new Date('2026-01-17T12:00:00.000Z').getTime(); // gap
  const tasks = [
    { status: 'completed', completed_at: day1 },
    { status: 'completed', completed_at: day2 },
    { status: 'completed', completed_at: day5 }
  ];
  assert.strictEqual(getBestStreak(tasks), 2);
});
