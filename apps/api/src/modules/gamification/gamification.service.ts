import { prisma } from '../../config/db';

// ─── Achievement definitions ──────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  { id: 'first_session',  icon: '🎯', label: 'First Step',     desc: 'Complete your first study session' },
  { id: 'streak_3',       icon: '🔥', label: 'On Fire',        desc: 'Study 3 days in a row' },
  { id: 'streak_7',       icon: '⚡', label: 'Committed',      desc: 'Study 7 days in a row' },
  { id: 'streak_30',      icon: '🏆', label: 'Unstoppable',    desc: 'Study 30 days in a row' },
  { id: 'xp_100',         icon: '⭐', label: 'Getting Started',desc: 'Earn 100 XP' },
  { id: 'xp_500',         icon: '🌟', label: 'Dedicated',      desc: 'Earn 500 XP' },
  { id: 'xp_1000',        icon: '🎓', label: 'Scholar',        desc: 'Earn 1,000 XP' },
  { id: 'sessions_10',    icon: '📚', label: 'Study Habit',    desc: 'Complete 10 sessions' },
  { id: 'sessions_50',    icon: '💪', label: 'Power Studier',  desc: 'Complete 50 sessions' },
  { id: 'level_5',        icon: '🚀', label: 'Level Up!',      desc: 'Reach level 5' },
];

// ─── XP & level math ──────────────────────────────────────────────────────────
export function xpForDuration(durationMins: number): number {
  if (durationMins <= 30) return 25;
  if (durationMins <= 60) return 50;
  return 100;
}

export function levelFromXp(xp: number): number {
  if (xp < 100)  return 1;
  if (xp < 300)  return 2;
  if (xp < 600)  return 3;
  if (xp < 1000) return 4;
  if (xp < 1500) return 5;
  if (xp < 2200) return 6;
  if (xp < 3000) return 7;
  if (xp < 4000) return 8;
  if (xp < 5200) return 9;
  return 10 + Math.floor((xp - 5200) / 1500);
}

const LEVEL_THRESHOLDS = [100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5200];

export function xpForNextLevel(level: number): number {
  return LEVEL_THRESHOLDS[level - 1] ?? (5200 + (level - 9) * 1500);
}

// ─── Streak management ────────────────────────────────────────────────────────
function updateStreakCount(stats: { streak: number; longestStreak: number; lastStudyDate: Date | null }) {
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const lastDate  = stats.lastStudyDate ? new Date(stats.lastStudyDate) : null;
  if (lastDate) lastDate.setHours(0, 0, 0, 0);

  const diffDays = lastDate
    ? Math.round((today.getTime() - lastDate.getTime()) / 86_400_000)
    : 999;

  let { streak } = stats;
  if (diffDays === 0) return { streak, longestStreak: stats.longestStreak, lastStudyDate: stats.lastStudyDate };
  if (diffDays === 1) streak += 1;
  else                streak = 1;

  const longestStreak = Math.max(streak, stats.longestStreak);
  return { streak, longestStreak, lastStudyDate: today };
}

// ─── Achievement check ────────────────────────────────────────────────────────
function checkNewAchievements(
  earned:    string[],
  newXp:     number,
  newStreak: number,
  totalSessions: number,
  newLevel:  number,
): string[] {
  const unlocked: string[] = [];
  const check = (id: string, cond: boolean) => {
    if (cond && !earned.includes(id)) { earned.push(id); unlocked.push(id); }
  };

  check('first_session', totalSessions >= 1);
  check('streak_3',      newStreak >= 3);
  check('streak_7',      newStreak >= 7);
  check('streak_30',     newStreak >= 30);
  check('xp_100',        newXp >= 100);
  check('xp_500',        newXp >= 500);
  check('xp_1000',       newXp >= 1000);
  check('sessions_10',   totalSessions >= 10);
  check('sessions_50',   totalSessions >= 50);
  check('level_5',       newLevel >= 5);

  return unlocked;
}

// ─── Main award function (called after completing a session) ──────────────────
export async function awardSessionXp(
  userId:      string,
  durationMins: number,
): Promise<{ xp: number; newLevel: number; prevLevel: number; unlockedAchievements: string[]; stats: any }> {
  const xpGained = xpForDuration(durationMins);

  // Upsert stats row
  let stats = await prisma.userStats.upsert({
    where:  { userId },
    create: { userId },
    update: {},
  });

  // Update streak
  const streakUpdate = updateStreakCount(stats);

  const newXp       = stats.xp + xpGained;
  const prevLevel   = stats.level;
  const newLevel    = levelFromXp(newXp);
  const newSessions = stats.totalSessions + 1;
  const newMinutes  = stats.totalMinutes + durationMins;

  const unlockedAchievements = checkNewAchievements(
    [...stats.achievements],
    newXp,
    streakUpdate.streak,
    newSessions,
    newLevel,
  );

  const updatedStats = await prisma.userStats.update({
    where: { userId },
    data: {
      xp:           newXp,
      level:        newLevel,
      streak:       streakUpdate.streak,
      longestStreak: streakUpdate.longestStreak,
      lastStudyDate: streakUpdate.lastStudyDate,
      totalSessions: newSessions,
      totalMinutes:  newMinutes,
      achievements: [...stats.achievements, ...unlockedAchievements],
    },
  });

  return { xp: xpGained, newLevel, prevLevel, unlockedAchievements, stats: updatedStats };
}

// ─── Get or create stats (safe for any user) ─────────────────────────────────
export async function getOrCreateStats(userId: string) {
  return prisma.userStats.upsert({
    where:  { userId },
    create: { userId },
    update: {},
  });
}

// ─── Enrich stats with achievement metadata ───────────────────────────────────
export function enrichStatsWithAchievements(stats: any) {
  const earned = new Set<string>(stats.achievements ?? []);
  return {
    ...stats,
    xpForNextLevel: xpForNextLevel(stats.level),
    xpProgress:     stats.xp - (xpForNextLevel(stats.level - 1) || 0),
    xpRange:        xpForNextLevel(stats.level) - (xpForNextLevel(stats.level - 1) || 0),
    achievements: ACHIEVEMENTS.map(a => ({ ...a, earned: earned.has(a.id) })),
  };
}
