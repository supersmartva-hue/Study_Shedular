import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from './sessions.service';

export async function getSessionsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const sessions = await svc.getSessions(req.user!.id, {
      studyItemId: typeof req.query.studyItemId === 'string' ? req.query.studyItemId : undefined,
      status:      typeof req.query.status      === 'string' ? req.query.status      : undefined,
      from:        typeof req.query.from === 'string' ? new Date(req.query.from) : undefined,
      to:          typeof req.query.to   === 'string' ? new Date(req.query.to)   : undefined,
    });
    res.json({ success: true, data: sessions });
  } catch (err) { next(err); }
}

export async function getSessionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await svc.getSession(String(req.params.id), req.user!.id);
    res.json({ success: true, data: session });
  } catch (err) { next(err); }
}

const createSchema = z.object({
  studyItemId:  z.string().uuid(),
  title:        z.string().min(1).max(255),
  plannedDate:  z.string().datetime(),
  startTime:    z.string().regex(/^\d{2}:\d{2}$/),
  endTime:      z.string().regex(/^\d{2}:\d{2}$/),
  durationMins: z.number().int().min(1).max(480),
  notes:        z.string().max(1000).optional(),
});

export async function createSessionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body    = createSchema.parse(req.body);
    const session = await svc.createSession(req.user!.id, {
      ...body,
      plannedDate: new Date(body.plannedDate),
    });
    res.status(201).json({ success: true, data: session });
  } catch (err) { next(err); }
}

export async function completeSessionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.completeSession(String(req.params.id), req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function skipSessionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await svc.skipSession(String(req.params.id), req.user!.id);
    res.json({ success: true, data: session });
  } catch (err) { next(err); }
}

export async function deleteSessionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteSession(String(req.params.id), req.user!.id);
    res.json({ success: true, message: 'Session deleted' });
  } catch (err) { next(err); }
}

export async function getWeekHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dateStr   = typeof req.query.date === 'string' ? req.query.date : undefined;
    const weekStart = dateStr ? new Date(dateStr) : getThisMonday();
    weekStart.setHours(0, 0, 0, 0);
    const sessions = await svc.getWeekSessions(req.user!.id, weekStart);
    res.json({ success: true, data: { weekStart: weekStart.toISOString(), sessions } });
  } catch (err) { next(err); }
}

function getThisMonday() {
  const d   = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // handle Sunday
  d.setDate(d.getDate() + diff);
  return d;
}
