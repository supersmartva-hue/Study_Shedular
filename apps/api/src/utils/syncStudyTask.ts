import { prisma } from '../config/db';

export interface SessionForSync {
  id:           string;
  title:        string;
  plannedDate:  Date;
  startTime:    string;
  endTime:      string;
  durationMins: number;
  studyItemId:  string;
}

function sessionDueDate(plannedDate: Date, endTime: string): Date {
  const due = new Date(plannedDate);
  const [h, m] = endTime.split(':').map(Number);
  due.setHours(h, m, 0, 0);
  return due;
}

/**
 * Creates a task linked to a study session.
 * Source is always 'study' so the To-Do dashboard can filter by it.
 */
export async function createTaskForSession(
  userId:  string,
  session: SessionForSync,
): Promise<string> {
  const task = await prisma.task.create({
    data: {
      userId,
      title:       session.title,
      description: `Study session · ${session.startTime}–${session.endTime} · ${session.durationMins} min`,
      dueDate:     sessionDueDate(session.plannedDate, session.endTime),
      priority:    2,
      source:      'study',
      sourceMeta:  { sessionId: session.id, studyItemId: session.studyItemId },
    },
  });
  return task.id;
}

/** Finds the task that was created for a given session (works for both 'study' and legacy 'study_sync'). */
export async function findTaskForSession(userId: string, sessionId: string) {
  return prisma.task.findFirst({
    where: {
      userId,
      sourceMeta: { path: ['sessionId'], equals: sessionId },
    },
  });
}

/** Marks the linked task done when a session is completed. */
export async function completeTaskForSession(userId: string, sessionId: string): Promise<void> {
  const task = await findTaskForSession(userId, sessionId);
  if (!task) return;
  await prisma.task.update({
    where: { id: task.id },
    data:  { status: 'done', updatedAt: new Date() },
  });
}

/** Deletes the linked task when a session is deleted. */
export async function deleteTaskForSession(userId: string, sessionId: string): Promise<void> {
  const task = await findTaskForSession(userId, sessionId);
  if (!task) return;
  await prisma.task.delete({ where: { id: task.id } }).catch(() => {});
}
