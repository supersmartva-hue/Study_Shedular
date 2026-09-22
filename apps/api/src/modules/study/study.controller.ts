import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from './study.service';
import { createTask } from '../tasks/tasks.service';

const studySchema = z.object({
  type:           z.enum(['subject', 'book', 'course', 'language']),
  title:          z.string().min(1).max(255),
  description:    z.string().optional(),
  priorityPct:    z.number().int().min(0).max(100).optional(),
  color:          z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  deadline:       z.string().datetime().optional(),
  estimatedHours: z.number().min(0).max(9999).optional(),
  difficulty:     z.number().int().min(1).max(5).optional(),
});

const p = (v: string | string[]) => String(v);

export async function createStudyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = studySchema.parse(req.body);
    const item = await svc.createStudyItem(req.user!.id, {
      ...body,
      deadline: body.deadline ? new Date(body.deadline) : undefined,
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
}

export async function getStudyListHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await svc.getStudyItems(req.user!.id, req.query.type as string);
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
}

export async function getStudyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await svc.getStudyItem(p(req.params.id), req.user!.id);
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
}

export async function updateStudyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = studySchema.partial().parse(req.body);
    const item = await svc.updateStudyItem(p(req.params.id), req.user!.id, {
      ...body,
      deadline: body.deadline ? new Date(body.deadline) : undefined,
    });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
}

export async function deleteStudyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteStudyItem(p(req.params.id), req.user!.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}

// Notes
export async function createNoteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content } = z.object({
      title:   z.string().optional(),
      content: z.string().min(1),
    }).parse(req.body);
    const note = await svc.createNote(p(req.params.id), req.user!.id, title, content);
    res.status(201).json({ success: true, data: note });
  } catch (err) { next(err); }
}

export async function updateNoteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.object({ title: z.string().optional(), content: z.string().optional() }).parse(req.body);
    const note = await svc.updateNote(p(req.params.nid), req.user!.id, body);
    res.json({ success: true, data: note });
  } catch (err) { next(err); }
}

export async function deleteNoteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteNote(p(req.params.nid), req.user!.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}

// Resources
export async function addResourceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.file) {
      const resource = await svc.addPdfResource(
        p(req.params.id), req.user!.id,
        req.body.title,
        req.file.buffer,
        req.file.originalname
      );
      res.status(201).json({ success: true, data: resource });
    } else {
      const { title, url } = z.object({ title: z.string().optional(), url: z.string().url() }).parse(req.body);
      const resource = await svc.addLinkResource(p(req.params.id), req.user!.id, title, url);
      res.status(201).json({ success: true, data: resource });
    }
  } catch (err) { next(err); }
}

export async function deleteResourceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteResource(p(req.params.rid), req.user!.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}

// Smart sync
export async function getSyncSuggestionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const suggestion = await svc.getSyncSuggestion(p(req.params.id), req.user!.id);
    res.json({ success: true, data: suggestion });
  } catch (err) { next(err); }
}

export async function confirmSyncHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const suggestion = await svc.getSyncSuggestion(p(req.params.id), req.user!.id);
    const override   = req.body;
    const task = await createTask({
      userId:      req.user!.id,
      title:       override.title       ?? suggestion.title,
      description: override.description ?? suggestion.description,
      dueDate:     override.dueDate ? new Date(override.dueDate) : suggestion.dueDate,
      reminderAt:  override.reminderAt ? new Date(override.reminderAt) : undefined,
      priority:    override.priority    ?? suggestion.priority,
      source:      'study',
      sourceMeta:  suggestion.sourceMeta,
    });
    res.status(201).json({ success: true, data: task });
  } catch (err) { next(err); }
}
