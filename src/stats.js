/**
 * Snagd Stats Module
 * Computes completion rate and daily streak stats
 * from task completion history
 */

function getCompletionRate(tasks, windowDays = 7) {
  const cutoff = Date.now() - (windowDays * 24 * 60 * 60 * 1000);
  const inWindow = tasks.filter(t => t.created_at >= cutoff);
  if (inWindow.length === 0) return 0;
  const completed = inWindow.filter(t => t.status === 'completed').length;
  return Math.round((completed / inWindow.length) * 100);
}

function getActiveDays(tasks) {
  const days = new Set();
  tasks
    .filter(t => t.status === 'completed' && t.completed_at)
    .forEach(t => {
      const day = new Date(t.completed_at).toISOString().split('T')[0];
      days.add(day);
    });
  return days;
}

function getCurrentStreak(tasks) {
  const activeDays = getActiveDays(tasks);
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const dayStr = cursor.toISOString().split('T')[0];
    if (!activeDays.has(dayStr)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getBestStreak(tasks) {
  const activeDays = Array.from(getActiveDays(tasks)).sort();
  if (activeDays.length === 0) return 0;
  let best = 1;
  let current = 1;
  for (let i = 1; i < activeDays.length; i++) {
    const prev = new Date(activeDays[i - 1]);
    const curr = new Date(activeDays[i]);
    const dayDiff = Math.round((curr - prev) / (24 * 60 * 60 * 1000));
    current = dayDiff === 1 ? current + 1 : 1;
    best = Math.max(best, current);
  }
  return best;
}

module.exports = {
  getCompletionRate,
  getActiveDays,
  getCurrentStreak,
  getBestStreak
};
