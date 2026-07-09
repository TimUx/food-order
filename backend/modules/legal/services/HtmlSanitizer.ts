const ALLOWED_TAGS = new Set([
  'p', 'br',
  'strong', 'b',
  'em', 'i',
  'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'a',
]);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseTagName(raw: string): { closing: boolean; tagName: string } | null {
  const match = raw.match(/^<\s*(\/)?\s*([a-z0-9]+)\b/i);
  if (!match) return null;
  return {
    closing: Boolean(match[1]),
    tagName: match[2]!.toLowerCase(),
  };
}

function sanitizeHref(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (
    value.startsWith('/') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('mailto:') ||
    value.startsWith('tel:')
  ) {
    return value;
  }
  return null;
}

function readAttribute(tag: string, name: string): string | null {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`${escapedName}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return match ? (match[2] ?? match[3] ?? '') : null;
}

function readPositiveInteger(tag: string, name: string): string | null {
  const value = readAttribute(tag, name);
  if (!value) return null;
  if (!/^\d{1,2}$/.test(value)) return null;
  return value;
}

function sanitizeOpeningTag(tagName: string, rawTag: string): string {
  if (tagName === 'br') return '<br>';

  if (tagName === 'a') {
    const href = sanitizeHref(readAttribute(rawTag, 'href') ?? '');
    if (!href) return '';
    const target = readAttribute(rawTag, 'target') === '_blank' ? ' target="_blank"' : '';
    const rel = target ? ' rel="noopener noreferrer"' : '';
    return `<a href="${escapeHtml(href)}"${target}${rel}>`;
  }

  if (tagName === 'td' || tagName === 'th') {
    const colspan = readPositiveInteger(rawTag, 'colspan');
    const rowspan = readPositiveInteger(rawTag, 'rowspan');
    const attrs = [
      colspan ? ` colspan="${colspan}"` : '',
      rowspan ? ` rowspan="${rowspan}"` : '',
    ].join('');
    return `<${tagName}${attrs}>`;
  }

  return `<${tagName}>`;
}

export function sanitizeRichTextHtml(input: string): string {
  const source = (input ?? '').replace(/<!--[\s\S]*?-->/g, '');
  let output = '';
  let lastIndex = 0;
  const tagPattern = /<[^>]*>/g;

  for (const match of source.matchAll(tagPattern)) {
    const rawTag = match[0];
    const start = match.index ?? 0;
    output += escapeHtml(source.slice(lastIndex, start));

    const parsed = parseTagName(rawTag);
    if (parsed && ALLOWED_TAGS.has(parsed.tagName)) {
      output += parsed.closing
        ? `</${parsed.tagName}>`
        : sanitizeOpeningTag(parsed.tagName, rawTag);
    }

    lastIndex = start + rawTag.length;
  }

  output += escapeHtml(source.slice(lastIndex));

  return output
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
