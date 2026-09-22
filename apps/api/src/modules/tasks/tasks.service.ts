import { prisma } from '../../config/db';

interface CreateTaskInput {
  userId:      string;
  title:       string;
  description?: string;
  dueDate?:    Date;
  reminderAt?: Date;
  priority?:   number;
  source?:     string;
  sourceMeta?: object;
  tags?:       string[];
}

interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: string;
}

export async function createTask(input: CreateTaskInput) {
  const task = await prisma.task.create({
    data: {
      userId:      input.userId,
      title:       input.title,
      description: input.description,
      dueDate:     input.dueDate,
      reminderAt:  input.reminderAt,
      priority:    input.priority ?? 2,
      source:      input.source   ?? 'manual',
      sourceMeta:  input.sourceMeta ?? {},
      tags:        input.tags ?? [],
    },
  });

  return task;
}

export async function getUserTasks(
  userId: string,
  filters: { status?: string; from?: Date; to?: Date; priority?: number }
) {
  return prisma.task.findMany({
    where: {
      userId,
      ...(filters.status   && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.from && filters.to && {
        dueDate: { gte: filters.from, lte: filters.to },
      }),
    },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
  });
}

export async function getTask(id: string, userId: string) {
  const task = await prisma.task.findFirst({ where: { id, userId } });
  if (!task) {
    const err = new Error('Task not found') as any;
    err.status = 404;
    throw err;
  }
  return task;
}

export async function updateTask(id: string, userId: string, data: UpdateTaskInput) {
  await getTask(id, userId);
  return prisma.task.update({
    where: { id },
    data:  { ...data, updatedAt: new Date() },
  });
}

export async function deleteTask(id: string, userId: string) {
  await getTask(id, userId);
  return prisma.task.delete({ where: { id } });
}

export async function completeTask(id: string, userId: string) {
  return updateTask(id, userId, { status: 'done' });
}

export async function getCalendarTasks(userId: string, year: number, month: number) {
  const from = new Date(year, month - 1, 1);
  const to   = new Date(year, month, 0, 23, 59, 59);
  const tasks = await getUserTasks(userId, { from, to });

  const grouped: Record<string, typeof tasks> = {};
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const key = task.dueDate.toISOString().split('T')[0];
    grouped[key] ??= [];
    grouped[key].push(task);
  }
  return grouped;
}

export async function getTasksDueForReminder() {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60_000);
  const windowEnd = new Date(now.getTime() + 60_000);
  return prisma.task.findMany({
    where: {
      status:     { not: 'done' },
      reminderAt: { gte: windowStart, lte: windowEnd },
    },
    include: { user: { select: { id: true, pushSub: true } } },
  });
}

/** Returns tasks whose reminder fires in 14–16 minutes (15-min warning window). */
export async function getTasksDueForWarning() {
  const now = Date.now();
  const in13 = new Date(now + 13 * 60_000);
  const in16 = new Date(now + 16 * 60_000);
  return prisma.task.findMany({
    where: {
      status:     { not: 'done' },
      reminderAt: { gte: in13, lte: in16 },
    },
    include: { user: { select: { id: true, pushSub: true } } },
  });
}

export async function syncLocalTasks(
  userId: string,
  localTasks: Array<{
    id: string;
    title: string;
    description?: string;
    priority: number;
    dueDate?: string;
    done: boolean;
    createdAt: string;
  }>
) {
  const syncedTasks = [];
  const existingTasks = await prisma.task.findMany({
    where: { userId, source: 'manual' },
    select: { id: true, sourceMeta: true },
  });

  for (const lt of localTasks) {
    const existing = existingTasks.find(task =>
      task.sourceMeta &&
      typeof task.sourceMeta === 'object' &&
      !Array.isArray(task.sourceMeta) &&
      (task.sourceMeta as { localId?: unknown }).localId === lt.id
    );

    if (!existing) {
      const task = await prisma.task.create({
        data: {
          userId,
          title: lt.title,
          description: lt.description,
          priority: lt.priority ?? 2,
          dueDate: lt.dueDate ? new Date(lt.dueDate) : undefined,
          status: lt.done ? 'done' : 'pending',
          source: 'manual',
          sourceMeta: { syncedFromLocal: true, localId: lt.id },
          tags: [],
          createdAt: new Date(lt.createdAt),
        },
      });
      syncedTasks.push(task);
    }
  }
  return syncedTasks;
}
