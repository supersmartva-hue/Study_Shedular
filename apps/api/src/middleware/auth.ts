import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Missing token' });
    return;
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
