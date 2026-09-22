import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';

const registerSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body   = registerSchema.parse(req.body);
    const result = await authService.register(body.name, body.email, body.password);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body   = loginSchema.parse(req.body);
    const result = await authService.login(body.email, body.password);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) { res.status(400).json({ success: false, message: 'refreshToken required' }); return; }
    const result = await authService.refresh(refreshToken);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function getMeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.user!.id);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

export async function updateMeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      name:     z.string().min(2).max(100).optional(),
      language: z.enum(['english', 'urdu', 'roman_urdu']).optional(),
      timezone: z.string().optional(),
    });
    const body   = schema.parse(req.body);
    const user   = await authService.updateMe(req.user!.id, body);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}
