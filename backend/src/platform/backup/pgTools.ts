import { spawn } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import type { DbConnectionConfig } from './dbConnection';

function pgEnv(db: DbConnectionConfig): NodeJS.ProcessEnv {
  return { ...process.env, PGPASSWORD: db.password };
}

function waitForClose(child: ReturnType<typeof spawn>, label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} fehlgeschlagen (Exit ${code ?? 'unknown'})`));
    });
  });
}

export async function assertPgToolsAvailable(): Promise<void> {
  for (const cmd of ['pg_dump', 'psql', 'gzip', 'gunzip']) {
    await assertCommandAvailable(cmd);
  }
}

async function assertCommandAvailable(cmd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('sh', ['-c', `command -v ${cmd} >/dev/null 2>&1`]);
    child.on('error', () => reject(new Error(`Befehl '${cmd}' nicht verfügbar`)));
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Befehl '${cmd}' nicht verfügbar`))));
  });
}

export async function createPgDumpGzip(outputPath: string, db: DbConnectionConfig): Promise<void> {
  const pgDump = spawn(
    'pg_dump',
    [
      '-h', db.host,
      '-p', String(db.port),
      '-U', db.user,
      '-d', db.database,
      '--no-owner',
      '--no-acl',
      '--clean',
      '--if-exists',
    ],
    { env: pgEnv(db) }
  );
  const gzip = spawn('gzip', ['-c']);
  const out = createWriteStream(outputPath);

  pgDump.stdout.pipe(gzip.stdin);
  const streams = Promise.all([
    pipeline(gzip.stdout, out),
    waitForClose(pgDump, 'pg_dump'),
    waitForClose(gzip, 'gzip'),
  ]);
  pgDump.stderr.on('data', (chunk: Buffer) => {
    process.stderr.write(chunk);
  });
  await streams;
}

export async function restorePgDumpGzip(inputPath: string, db: DbConnectionConfig): Promise<void> {
  await terminateOtherDatabaseSessions(db);

  const gunzip = spawn('gunzip', ['-c', inputPath]);
  const psql = spawn(
    'psql',
    [
      '-h', db.host,
      '-p', String(db.port),
      '-U', db.user,
      '-d', db.database,
      '-v', 'ON_ERROR_STOP=1',
    ],
    { env: pgEnv(db) }
  );

  gunzip.stdout.pipe(psql.stdin);
  const streams = Promise.all([
    waitForClose(gunzip, 'gunzip'),
    waitForClose(psql, 'psql'),
  ]);
  gunzip.stderr.on('data', (chunk: Buffer) => process.stderr.write(chunk));
  psql.stderr.on('data', (chunk: Buffer) => process.stderr.write(chunk));
  await streams;
}

async function terminateOtherDatabaseSessions(db: DbConnectionConfig): Promise<void> {
  const psql = spawn(
    'psql',
    [
      '-h', db.host,
      '-p', String(db.port),
      '-U', db.user,
      '-d', db.database,
      '-v', 'ON_ERROR_STOP=1',
      '-c',
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();",
    ],
    { env: pgEnv(db) }
  );
  await waitForClose(psql, 'psql');
}

export async function validateGzipFile(filePath: string): Promise<{ sizeBytes: number }> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('gzip', ['-t', filePath]);
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error('Ungültiges gzip-Archiv'))));
  });
  const { statSync } = await import('fs');
  const sizeBytes = statSync(filePath).size;
  if (sizeBytes < 100) {
    throw new Error(`Backup-Datei ist zu klein (${sizeBytes} Bytes)`);
  }
  return { sizeBytes };
}

export async function readGzipJson<T>(filePath: string): Promise<T> {
  const gunzip = spawn('gunzip', ['-c', filePath]);
  const chunks: Buffer[] = [];
  gunzip.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
  await waitForClose(gunzip, 'gunzip');
  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw) as T;
}

export async function writeGzipJson(outputPath: string, payload: unknown): Promise<void> {
  const gzip = spawn('gzip', ['-c']);
  const out = createWriteStream(outputPath);
  gzip.stdin.write(JSON.stringify(payload, jsonReplacer, 2));
  gzip.stdin.end();
  gzip.stdout.pipe(out);
  await Promise.all([pipeline(gzip.stdout, out), waitForClose(gzip, 'gzip')]);
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === 'object' && 'toFixed' in value && typeof (value as { toFixed: unknown }).toFixed === 'function') {
    return value.toString();
  }
  return value;
}

export async function readGzipTextSample(filePath: string, maxBytes = 4096): Promise<string> {
  const input = createReadStream(filePath);
  const gunzip = spawn('gunzip', ['-c']);
  input.pipe(gunzip.stdin);
  const chunks: Buffer[] = [];
  let total = 0;
  gunzip.stdout.on('data', (chunk: Buffer) => {
    if (total >= maxBytes) return;
    chunks.push(chunk.subarray(0, maxBytes - total));
    total += chunk.length;
  });
  await waitForClose(gunzip, 'gunzip');
  return Buffer.concat(chunks).toString('utf8');
}
