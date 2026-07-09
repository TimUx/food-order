import sharp from 'sharp';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

const MAX_DIMENSION = 1920;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const uploadService = {
  memory: multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      cb(null, allowed.includes(file.mimetype));
    },
  }),

  async processImage(buffer: Buffer): Promise<{ buffer: Buffer; extension: 'webp' | 'jpg' }> {
    try {
      const image = sharp(buffer, { failOn: 'none' }).rotate();
      const metadata = await image.metadata();

      let pipeline = image;
      if (
        (metadata.width && metadata.width > MAX_DIMENSION) ||
        (metadata.height && metadata.height > MAX_DIMENSION)
      ) {
        pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      const hasAlpha = metadata.hasAlpha;
      if (hasAlpha) {
        const output = await pipeline.webp({ quality: 85 }).toBuffer();
        return { buffer: output, extension: 'webp' };
      }

      const output = await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
      return { buffer: output, extension: 'jpg' };
    } catch {
      throw new AppError(400, 'Bild konnte nicht verarbeitet werden');
    }
  },

  async saveProcessedImage(
    file: Express.Multer.File,
    prefix: string
  ): Promise<{ filename: string; imageUrl: string }> {
    if (!file.buffer?.length) {
      throw new AppError(400, 'Kein Bild hochgeladen');
    }

    const { requireTenantId } = await import('../platform/tenant/tenantScope');
    const tenantId = requireTenantId();
    const uploadDir = path.resolve(config.uploadsDir, tenantId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const { buffer, extension } = await this.processImage(file.buffer);
    const safePrefix = prefix.replace(/[^a-z0-9-]/gi, '').slice(0, 32) || 'img';
    const filename = `${safePrefix}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
    const filepath = path.join(uploadDir, filename);

    await fs.promises.writeFile(filepath, buffer);

    return {
      filename,
      imageUrl: `/uploads/${tenantId}/${filename}`,
    };
  },
};
