#!/usr/bin/env npx tsx
/**
 * CI guard: block direct prisma.<tenantModel> access outside allowlisted files.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  ALLOWLIST_ALL,
  ALLOWLIST_SCOPED_SERVICES,
  SCOPED_SERVICE_MARKERS,
  SCAN_GLOBS,
  SCAN_IGNORE,
  TENANT_SCOPED_MODELS,
} from './tenant-prisma-policy';

export interface TenantGuardViolation {
  file: string;
  line: number;
  model: string;
  snippet: string;
  reason: string;
}

const ROOT = path.resolve(import.meta.dirname, '../..');

function normalizeRel(filePath: string): string {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function shouldIgnore(relPath: string): boolean {
  return SCAN_IGNORE.some((re) => re.test(relPath));
}

function collectTsFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];

  const out: string[] = [];
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const rel = normalizeRel(full);
      if (shouldIgnore(rel)) continue;
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts')) out.push(full);
    }
  };
  walk(abs);
  return out;
}

function buildModelPattern(): RegExp {
  const models = TENANT_SCOPED_MODELS.join('|');
  return new RegExp(`\\bprisma\\.(${models})\\.`, 'g');
}

export function scanContent(
  relPath: string,
  content: string,
  allowlist: readonly string[] = ALLOWLIST_ALL
): TenantGuardViolation[] {
  const violations: TenantGuardViolation[] = [];
  const pattern = buildModelPattern();
  const lines = content.split('\n');
  const isAllowed = allowlist.includes(relPath as (typeof ALLOWLIST_ALL)[number]);

  if (isAllowed) {
    if ((ALLOWLIST_SCOPED_SERVICES as readonly string[]).includes(relPath)) {
      const hasScopeMarker = SCOPED_SERVICE_MARKERS.some((m) => content.includes(m));
      if (!hasScopeMarker) {
        violations.push({
          file: relPath,
          line: 1,
          model: '*',
          snippet: '',
          reason:
            'Scoped service must import tenantWhere/requireTenantId/withTenantId/assertTenantOwnership',
        });
      }
    }
    return violations;
  }

  lines.forEach((line, idx) => {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      violations.push({
        file: relPath,
        line: idx + 1,
        model: match[1],
        snippet: line.trim(),
        reason: `Direct prisma.${match[1]} outside allowlisted repository/platform layer`,
      });
    }
  });

  return violations;
}

export function scanProject(extraFiles: string[] = []): TenantGuardViolation[] {
  const files = new Set<string>();
  for (const dir of SCAN_GLOBS) {
    for (const f of collectTsFiles(dir)) files.add(f);
  }
  for (const f of extraFiles) files.add(path.resolve(f));

  const violations: TenantGuardViolation[] = [];
  for (const abs of files) {
    const rel = normalizeRel(abs);
    const content = fs.readFileSync(abs, 'utf8');
    violations.push(...scanContent(rel, content));
  }
  return violations;
}

function main(): void {
  const violations = scanProject();
  if (violations.length === 0) {
    console.log('Tenant Prisma guard: OK (no violations)');
    return;
  }

  console.error(`Tenant Prisma guard: ${violations.length} violation(s)\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} prisma.${v.model}`);
    console.error(`    ${v.reason}`);
    if (v.snippet) console.error(`    > ${v.snippet}`);
  }
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main();
}
