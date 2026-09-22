import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      200,
  standardHeaders: true,
  legacyHeaders:   false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, message: 'Too many auth attempts, try again later' },
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      15,
  message:  { success: false, message: 'AI rate limit exceeded, please wait' },
});
