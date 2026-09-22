import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import type { Request } from 'express';

if (env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key:    env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter(_req: Request, file, cb) {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

export async function uploadToCloudinary(
  buffer: Buffer,
  folder:   string,
  filename: string
): Promise<{ url: string; bytes: number }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder, public_id: filename, resource_type: 'raw', format: 'pdf' },
        (err, result) => {
          if (err || !result) reject(err ?? new Error('Upload failed'));
          else resolve({ url: result.secure_url, bytes: result.bytes });
        }
      )
      .end(buffer);
  });
}
