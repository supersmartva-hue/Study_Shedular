import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors:  err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof Error) {
    const status = (err as any).status ?? 500;
    res.status(status).json({ success: false, message: err.message });
    return;
  }

  res.status(500).json({ success: false, message: 'Internal server error' });
}
