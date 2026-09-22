import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const optionalApiKey = z.preprocess(
  (value) => value === '' ? undefined : value,
  z.string().min(1).optional(),
);

const envSchema = z.object({
  DATABASE_URL:           z.string().min(1),
  JWT_SECRET:             z.string().min(16),
  JWT_REFRESH_SECRET:     z.string().min(16),
  JWT_EXPIRES_IN:         z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  OPENAI_API_KEY:         optionalApiKey,
  GEMINI_API_KEY:         optionalApiKey,
  GROQ_API_KEY:           optionalApiKey,
  SERPER_API_KEY:         optionalApiKey,
  CLOUDINARY_CLOUD_NAME:  z.string().optional(),
  CLOUDINARY_API_KEY:     z.string().optional(),
  CLOUDINARY_API_SECRET:  z.string().optional(),
  GOOGLE_SEARCH_API_KEY:  z.string().optional(),
  GOOGLE_SEARCH_CX:       z.string().optional(),
  GOOGLE_BOOKS_API_KEY:   z.string().optional(),
  BRAVE_API_KEY:          z.string().optional(),
  VAPID_PUBLIC_KEY:       z.string().optional(),
  VAPID_PRIVATE_KEY:      z.string().optional(),
  VAPID_EMAIL:            z.string().optional(),
  CLIENT_URL:             z.string().default('http://localhost:3000'),
  PORT:                   z.string().default('4000'),
  NODE_ENV:               z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
