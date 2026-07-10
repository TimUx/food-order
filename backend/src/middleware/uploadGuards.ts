import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AppError } from './errorHandler';

export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Lehnt Uploads ab, wenn Content-Length den Multer-Grenzwert überschreitet
 * (bevor der Body vollständig gepuffert wird).
 */
export function assertUploadContentLength(maxBytes = UPLOAD_MAX_BYTES) {
  return (req: { headers: Record<string, string | string[] | undefined> }, _res: unknown, next: (err?: unknown) => void) => {
    const raw = req.headers['content-length'];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) {
      next();
      return;
    }

    const length = Number.parseInt(value, 10);
    if (Number.isFinite(length) && length > maxBytes) {
      next(new AppError(413, `Upload zu groß (max. ${Math.floor(maxBytes / (1024 * 1024))} MB)`));
      return;
    }

    next();
  };
}

/**
 * Optionaler AV-Hook: UPLOAD_AV_HOOK=/pfad/zu/scan.sh
 * Skript erhält Dateipfad als Argument; Exit-Code 0 = OK.
 */
export async function runOptionalAvScan(filePath: string): Promise<void> {
  const hook = process.env.UPLOAD_AV_HOOK?.trim();
  if (!hook) return;

  await new Promise<void>((resolve, reject) => {
    const child = spawn(hook, [filePath], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => reject(new AppError(500, `AV-Hook fehlgeschlagen: ${err.message}`)));
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new AppError(400, stderr.trim() || 'Upload durch AV-Prüfung abgelehnt'));
    });
  });
}

/** Temporäre Datei für AV-Hook (Buffer → Disk). */
export async function writeTempScanFile(buffer: Buffer, prefix: string): Promise<string> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'fs-upload-'));
  const filePath = path.join(dir, `${prefix}.bin`);
  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}

export async function cleanupTempScanFile(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
    await fs.promises.rmdir(path.dirname(filePath));
  } catch {
    // ignore cleanup errors
  }
}
