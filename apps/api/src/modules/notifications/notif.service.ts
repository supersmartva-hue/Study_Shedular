import webpush from 'web-push';
import { prisma } from '../../config/db';
import { env } from '../../config/env';

if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    env.VAPID_EMAIL ?? 'mailto:admin@example.com',
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
}

export interface CreateNotifInput {
  userId:  string;
  title:   string;
  body:    string;
  type?:   string;
  taskId?: string;
}

export async function createNotification(input: CreateNotifInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      title:  input.title,
      body:   input.body,
      type:   input.type ?? 'reminder',
      taskId: input.taskId,
    },
  });
}

export async function getNotifications(userId: string) {
  return prisma.notification.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    50,
  });
}

export async function markRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data:  { read: true },
  });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data:  { read: true },
  });
}

export async function savePushSubscription(userId: string, subscription: object) {
  return prisma.user.update({
    where: { id: userId },
    data:  { pushSub: subscription as any },
  });
}

export async function removePushSubscription(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data:  { pushSub: null as any },
  });
}

export async function sendPushToUser(userId: string, title: string, body: string, data?: object) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { pushSub: true },
  });
  if (!user?.pushSub) return;

  try {
    await webpush.sendNotification(
      user.pushSub as any,
      JSON.stringify({ title, body, data })
    );
  } catch (err: any) {
    // Subscription expired or invalid — remove it to prevent future failures
    if (err.statusCode === 410 || err.statusCode === 404) {
      await removePushSubscription(userId).catch(() => {});
    } else {
      console.error('Push notification failed:', err);
    }
  }
}
