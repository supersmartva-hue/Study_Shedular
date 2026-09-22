import { prisma } from '../../config/db';
import { uploadToCloudinary } from '../../middleware/upload';

export async function createStudyItem(
  userId: string,
  data: {
    type: string; title: string; description?: string;
    priorityPct?: number; color?: string; deadline?: Date;
    estimatedHours?: number; difficulty?: number;
  }
) {
  return prisma.studyItem.create({ data: { userId, ...data } });
}

export async function getStudyItems(userId: string, type?: string) {
  return prisma.studyItem.findMany({
    where: { userId, ...(type && { type }) },
    include: {
      _count: { select: { notes: true, resources: true } },
    },
    orderBy: [{ priorityPct: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getStudyItem(id: string, userId: string) {
  const item = await prisma.studyItem.findFirst({
    where: { id, userId },
    include: {
      notes:     { orderBy: { updatedAt: 'desc' } },
      resources: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!item) {
    const err = new Error('Study item not found') as any;
    err.status = 404;
    throw err;
  }
  return item;
}

export async function updateStudyItem(
  id: string, userId: string,
  data: Partial<{ type: string; title: string; description: string; priorityPct: number; color: string; deadline: Date; estimatedHours: number; difficulty: number }>
) {
  await getStudyItem(id, userId);
  return prisma.studyItem.update({ where: { id }, data });
}

export async function deleteStudyItem(id: string, userId: string) {
  await getStudyItem(id, userId);
  return prisma.studyItem.delete({ where: { id } });
}

// Notes
export async function createNote(studyItemId: string, userId: string, title: string | undefined, content: string) {
  return prisma.note.create({ data: { studyItemId, userId, title, content } });
}

export async function updateNote(id: string, userId: string, data: { title?: string; content?: string }) {
  const note = await prisma.note.findFirst({ where: { id, userId } });
  if (!note) { const e = new Error('Note not found') as any; e.status = 404; throw e; }
  return prisma.note.update({ where: { id }, data });
}

export async function deleteNote(id: string, userId: string) {
  const note = await prisma.note.findFirst({ where: { id, userId } });
  if (!note) { const e = new Error('Note not found') as any; e.status = 404; throw e; }
  return prisma.note.delete({ where: { id } });
}

// Resources
export async function addLinkResource(
  studyItemId: string, userId: string,
  title: string | undefined, url: string
) {
  return prisma.resource.create({ data: { studyItemId, userId, type: 'link', title, url } });
}

export async function addPdfResource(
  studyItemId: string, userId: string,
  title: string | undefined,
  buffer: Buffer, originalName: string
) {
  const filename = `${userId}/${studyItemId}/${Date.now()}-${originalName}`;
  const { url, bytes } = await uploadToCloudinary(buffer, 'study-pdfs', filename);
  return prisma.resource.create({
    data: { studyItemId, userId, type: 'pdf', title: title ?? originalName, url, fileSize: bytes },
  });
}

export async function deleteResource(id: string, userId: string) {
  const res = await prisma.resource.findFirst({ where: { id, userId } });
  if (!res) { const e = new Error('Resource not found') as any; e.status = 404; throw e; }
  return prisma.resource.delete({ where: { id } });
}

// Smart sync
export async function getSyncSuggestion(studyItemId: string, userId: string) {
  const item = await getStudyItem(studyItemId, userId);
  const daysLeft = item.deadline
    ? Math.ceil((item.deadline.getTime() - Date.now()) / 86_400_000)
    : 7;
  const suggestedDue = new Date(Date.now() + Math.max(1, daysLeft - 1) * 86_400_000);
  return {
    studyItemId: item.id,
    title:       `Study: ${item.title}`,
    description: item.description ?? `Work on ${item.type}: ${item.title}`,
    dueDate:     suggestedDue,
    priority:    item.priorityPct >= 75 ? 3 : item.priorityPct >= 40 ? 2 : 1,
    source:      'study',
    sourceMeta:  { studyItemId: item.id },
  };
}
