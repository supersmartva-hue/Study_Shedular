import cron from 'node-cron';
import { prisma } from '../../config/db';
import { getTasksDueForReminder, getTasksDueForWarning } from '../tasks/tasks.service';
import { sendPushToUser, createNotification } from './notif.service';

/**
 * Checks whether a notification of the given type was already sent
 * for this task within the last `withinMs` milliseconds.
 */
async function alreadyNotified(userId: string, taskId: string, type: string, withinMs: number) {
  const since = new Date(Date.now() - withinMs);
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      taskId,
      type,
      createdAt: { gte: since },
    },
  });
  return !!existing;
}

export function startReminderScheduler() {
  cron.schedule('* * * * *', async () => {
    try {
      // ── Alarm notifications — fires at reminderAt ─────────────────────────────
      const alarmTasks = await getTasksDueForReminder();
      for (const task of alarmTasks) {
        if (await alreadyNotified(task.userId, task.id, 'alarm', 3 * 60_000)) continue;

        const title = `⏰ Reminder: ${task.title}`;
        const body  = task.description ?? 'Your task is due now!';
        await createNotification({ userId: task.userId, title, body, type: 'alarm', taskId: task.id });
        await sendPushToUser(task.userId, title, body, { taskId: task.id, url: '/tasks' });
      }

      // ── Warning notifications — fires 15 minutes before reminderAt ────────────
      const warningTasks = await getTasksDueForWarning();
      for (const task of warningTasks) {
        if (await alreadyNotified(task.userId, task.id, 'warning', 20 * 60_000)) continue;

        const title = `⚠️ Due soon: ${task.title}`;
        const body  = 'Due in 15 minutes — get ready!';
        await createNotification({ userId: task.userId, title, body, type: 'warning', taskId: task.id });
        await sendPushToUser(task.userId, title, body, { taskId: task.id, url: '/tasks' });
      }
    } catch (err) {
      console.error('Reminder scheduler error:', err);
    }
  });

  console.log('Reminder scheduler started');
}
