import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { createTask } from '../tasks/tasks.service';

/**
 * POST /api/extension/capture
 *
 * Called from the Chrome extension to create a Task from the current page.
 */
const captureSchema = z.object({
  pageUrl:   z.string().url(),
  pageTitle: z.string().optional(),
  taskTitle: z.string().min(1).max(255),
  dueDate:   z.string().datetime().optional(),
  reminderAt: z.string().datetime().optional(),
  priority:  z.number().int().min(1).max(3).default(2),
});

export async function captureHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = captureSchema.parse(req.body);

    const capture = await prisma.extensionCapture.create({
      data: {
        userId:    req.user!.id,
        pageUrl:   body.pageUrl,
        pageTitle: body.pageTitle,
        topic:     body.taskTitle,
      },
    });

    const task = await createTask({
      userId:      req.user!.id,
      title:       body.taskTitle,
      description: body.pageUrl,
      dueDate:     body.dueDate ? new Date(body.dueDate) : undefined,
      reminderAt:  body.reminderAt ? new Date(body.reminderAt) : undefined,
      priority:    body.priority,
      source:      'extension',
      sourceMeta:  { pageUrl: body.pageUrl, captureId: capture.id },
    });

    await prisma.extensionCapture.update({
      where: { id: capture.id },
      data:  { converted: true, taskId: task.id },
    });

    res.status(201).json({ success: true, data: { capture, task } });
  } catch (err) { next(err); }
}

/**
 * POST /api/extension/study-capture
 *
 * Called from the Chrome extension to create a StudyItem from the current page.
 */
const studyCaptureSchema = z.object({
  pageUrl:        z.string().url(),
  pageTitle:      z.string().optional(),
  studyTitle:     z.string().min(1).max(255),
  studyType:      z.enum(['subject', 'book', 'course', 'language']).default('course'),
  estimatedHours: z.number().min(0).max(10000).default(10),
  priority:       z.number().int().min(1).max(3).default(2),
});

export async function studyCaptureHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = studyCaptureSchema.parse(req.body);

    const capture = await prisma.extensionCapture.create({
      data: {
        userId:    req.user!.id,
        pageUrl:   body.pageUrl,
        pageTitle: body.pageTitle,
        topic:     body.studyTitle,
      },
    });

    // Map priority 1-3 → priorityPct 33/66/100
    const priorityPct = body.priority === 1 ? 33 : body.priority === 3 ? 90 : 66;

    const studyItem = await prisma.studyItem.create({
      data: {
        userId:         req.user!.id,
        type:           body.studyType,
        title:          body.studyTitle,
        description:    `Captured from: ${body.pageUrl}`,
        priorityPct,
        estimatedHours: body.estimatedHours,
      },
    });

    await prisma.extensionCapture.update({
      where: { id: capture.id },
      data:  { converted: true },
    });

    res.status(201).json({ success: true, data: { capture, studyItem } });
  } catch (err) { next(err); }
}

export async function getCapturesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const captures = await prisma.extensionCapture.findMany({
      where:   { userId: req.user!.id },
      orderBy: { capturedAt: 'desc' },
      take:    30,
    });
    res.json({ success: true, data: captures });
  } catch (err) { next(err); }
}
