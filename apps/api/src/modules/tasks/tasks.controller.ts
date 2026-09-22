import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from './tasks.service';

const taskSchema = z.object({
  title:       z.string().min(1).max(255),
  description: z.string().optional(),
  dueDate:     z.string().datetime().optional(),
  reminderAt:  z.string().datetime().optional(),
  priority:    z.number().int().min(1).max(3).optional(),
  status:      z.enum(['pending', 'done']).optional(),
  source:      z.string().optional(),
  sourceMeta:  z.record(z.unknown()).optional(),
  tags:        z.array(z.string()).optional(),
});

export async function createTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = taskSchema.parse(req.body);
    const task = await svc.createTask({
      userId:      req.user!.id,
      ...body,
      dueDate:    body.dueDate    ? new Date(body.dueDate)    : undefined,
      reminderAt: body.reminderAt ? new Date(body.reminderAt) : undefined,
    });
    res.status(201).json({ success: true, data: task });
  } catch (err) { next(err); }
}

export async function getTasksHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const tasks = await svc.getUserTasks(req.user!.id, {
      status:   req.query.status   as string,
      priority: req.query.priority ? Number(req.query.priority) : undefined,
      from:     req.query.from ? new Date(req.query.from as string) : undefined,
      to:       req.query.to   ? new Date(req.query.to   as string) : undefined,
    });
    res.json({ success: true, data: tasks });
  } catch (err) { next(err); }
}

export async function getTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await svc.getTask(String(req.params.id), req.user!.id);
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
}

export async function updateTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = taskSchema.partial().parse(req.body);
    const task = await svc.updateTask(String(req.params.id), req.user!.id, {
      ...body,
      dueDate:    body.dueDate    ? new Date(body.dueDate)    : undefined,
      reminderAt: body.reminderAt ? new Date(body.reminderAt) : undefined,
    });
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
}

export async function deleteTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteTask(String(req.params.id), req.user!.id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) { next(err); }
}

export async function completeTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await svc.completeTask(String(req.params.id), req.user!.id);
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
}

export async function getCalendarHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const year  = Number(req.query.year)  || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const data  = await svc.getCalendarTasks(req.user!.id, year, month);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function syncLocalTasksHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const localTasks = z.array(z.object({
      id:           z.string(),
      title:        z.string(),
      description:  z.string().optional(),
      priority:     z.number().int().min(1).max(3),
      dueDate:      z.string().datetime().optional(),
      done:         z.boolean(),
      createdAt:    z.string(),
    })).parse(req.body);

    const syncedTasks = await svc.syncLocalTasks(req.user!.id, localTasks);
    res.json({ success: true, data: syncedTasks, count: syncedTasks.length });
  } catch (err) { next(err); }
}
