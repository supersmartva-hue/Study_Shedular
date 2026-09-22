import { prisma } from '../../config/db';
import { awardSessionXp } from '../gamification/gamification.service';
import {
  completeTaskForSession,
  deleteTaskForSession,
} from '../../utils/syncStudyTask';

function sessionDueDate(plannedDate: Date, endTime: string): Date {
  const due = new Date(plannedDate);
  const [h, m] = endTime.split(':').map(Number);
  due.setHours(h, m, 0, 0);
  return due;
}

export async function getSessions(
  userId: string,
  filters: { studyItemId?: string; status?: string; from?: Date; to?: Date },
) {
  return prisma.studySession.findMany({
    where: {
      userId,
      ...(filters.studyItemId && { studyItemId: filters.studyItemId }),
      ...(filters.status      && { status: filters.status }),
      ...((filters.from || filters.to) && {
        plannedDate: {
          ...(filters.from && { gte: filters.from }),
          ...(filters.to   && { lte: filters.to   }),
        },
      }),
    },
    include: {
      studyItem: { select: { title: true, color: true, type: true } },
    },
    orderBy: [{ plannedDate: 'asc' }, { startTime: 'asc' }],
  });
}

export async function getSession(id: string, userId: string) {
  const session = await prisma.studySession.findFirst({
    where: { id, userId },
    include: { studyItem: { select: { title: true, color: true, type: true } } },
  });
  if (!session) {
    const err = new Error('Session not found') as any;
    err.status = 404;
    throw err;
  }
  return session;
}

export async function createSession(userId: string, data: {
  studyItemId:  string;
  title:        string;
  plannedDate:  Date;
  startTime:    string;
  endTime:      string;
  durationMins: number;
  notes?:       string;
}) {
  // Run session creation and linked task creation in a single transaction
  // so a failure in either step leaves the database consistent.
  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.studySession.create({
      data: { userId, ...data },
      include: { studyItem: { select: { title: true, color: true, type: true } } },
    });

    await tx.task.create({
      data: {
        userId,
        title:       data.title,
        description: `Study session · ${data.startTime}–${data.endTime} · ${data.durationMins} min`,
        dueDate:     sessionDueDate(data.plannedDate, data.endTime),
        priority:    2,
        source:      'study',
        sourceMeta:  { sessionId: created.id, studyItemId: data.studyItemId },
      },
    });

    return created;
  });

  return session;
}

export async function completeSession(id: string, userId: string) {
  const session = await getSession(id, userId);
  if (session.status === 'completed') return { session, xpGained: 0, newAchievements: [] };

  const { xp, newLevel, prevLevel, unlockedAchievements, stats } =
    await awardSessionXp(userId, session.durationMins);

  await prisma.studyItem.update({
    where: { id: session.studyItemId },
    data:  { hoursCompleted: { increment: session.durationMins / 60 } },
  });

  const updated = await prisma.studySession.update({
    where: { id },
    data:  { status: 'completed', xpEarned: xp, completedAt: new Date() },
    include: { studyItem: { select: { title: true, color: true, type: true } } },
  });

  // Mark the linked task done so To-Do stays in sync
  await completeTaskForSession(userId, id);

  return {
    session:         updated,
    xpGained:        xp,
    leveledUp:       newLevel > prevLevel,
    newLevel,
    newAchievements: unlockedAchievements,
    stats,
  };
}

export async function skipSession(id: string, userId: string) {
  await getSession(id, userId);
  return prisma.studySession.update({
    where: { id },
    data:  { status: 'skipped' },
    include: { studyItem: { select: { title: true, color: true, type: true } } },
  });
}

export async function deleteSession(id: string, userId: string) {
  await getSession(id, userId);
  // Remove the linked task before deleting the session
  await deleteTaskForSession(userId, id);
  return prisma.studySession.delete({ where: { id } });
}

export async function getWeekSessions(userId: string, weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return prisma.studySession.findMany({
    where: {
      userId,
      plannedDate: { gte: weekStart, lte: weekEnd },
    },
    include: { studyItem: { select: { title: true, color: true, type: true } } },
    orderBy: [{ plannedDate: 'asc' }, { startTime: 'asc' }],
  });
}
