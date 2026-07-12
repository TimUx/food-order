/**
 * Prüft interne Markdown-Links in README, docs/ und SECURITY.md.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');

const SCAN_ROOTS = [
  root,
  path.join(root, 'docs'),
  path.join(root, 'docs/architecture'),
  path.join(root, 'docs/screenshots'),
];

const ROOT_FILES = ['README.md', 'SECURITY.md', 'CHANGELOG.md'];

const LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;
const SKIP_SCHEMES = /^(https?:|mailto:|#)/i;

interface BrokenLink {
  file: string;
  link: string;
  resolved: string;
}

function collectMarkdownFiles(): string[] {
  const files = new Set<string>();
  for (const f of ROOT_FILES) {
    const full = path.join(root, f);
    if (fs.existsSync(full)) files.add(full);
  }
  for (const dir of SCAN_ROOTS) {
    if (!fs.existsSync(dir)) continue;
    walk(dir, (file) => {
      if (file.endsWith('.md')) files.add(file);
    });
  }
  return [...files].sort();
}

function walk(dir: string, fn: (file: string) => void): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'audits') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, fn);
    else if (entry.isFile()) fn(full);
  }
}

function shouldCheckFile(_file: string): boolean {
  return true;
}

function resolveLink(fromFile: string, raw: string): string | null {
  const target = raw.split('#')[0].trim();
  if (!target || SKIP_SCHEMES.test(target)) return null;
  if (target.startsWith('/')) return null;
  return path.normalize(path.resolve(path.dirname(fromFile), target));
}

function checkFile(file: string): BrokenLink[] {
  const broken: BrokenLink[] = [];
  const content = fs.readFileSync(file, 'utf8');
  let match: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((match = LINK_RE.exec(content)) !== null) {
    const href = match[2];
    const resolved = resolveLink(file, href);
    if (!resolved) continue;
    if (!fs.existsSync(resolved)) {
      broken.push({
        file: path.relative(root, file),
        link: href,
        resolved: path.relative(root, resolved),
      });
    }
  }
  return broken;
}

/** Admin-Pfade für Akzeptanztest (max. 3 Klicks vom README). */
function assertAdminPaths(): string[] {
  const errors: string[] = [];
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const docsReadme = fs.readFileSync(path.join(root, 'docs/README.md'), 'utf8');

  const requiredInDocs = [
    'INSTALLATION.md',
    'ADMIN_GUIDE.md#erste-schritte-nach-der-installation',
    'OPERATIONS.md#vor-dem-sommerfest-checkliste',
  ];
  for (const fragment of requiredInDocs) {
    if (!docsReadme.includes(fragment)) {
      errors.push(`docs/README.md fehlt Link: ${fragment}`);
    }
  }

  for (const fragment of ['docs/INSTALLATION.md', 'docs/ADMIN_GUIDE.md', 'docs/OPERATIONS.md']) {
    if (!readme.includes(fragment)) {
      errors.push(`README.md fehlt Link: ${fragment}`);
    }
  }

  return errors;
}

function main(): void {
  const files = collectMarkdownFiles().filter(shouldCheckFile);
  const broken = files.flatMap(checkFile);
  const structureErrors = assertAdminPaths();

  const report = {
    filesChecked: files.length,
    brokenLinks: broken,
    structureErrors,
    failed: broken.length > 0 || structureErrors.length > 0,
  };

  console.log(JSON.stringify(report, null, 2));

  if (report.failed) {
    for (const b of broken) {
      console.error(`BROKEN: ${b.file} → ${b.link} (${b.resolved})`);
    }
    for (const e of structureErrors) {
      console.error(`STRUCTURE: ${e}`);
    }
    process.exit(1);
  }
}

main();
