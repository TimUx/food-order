import { describe, expect, it } from 'vitest';
import { sanitizeRichTextHtml } from './HtmlSanitizer';

describe('sanitizeRichTextHtml', () => {
  it('keeps allowed formatting tags', () => {
    const html = sanitizeRichTextHtml('<h2>Titel</h2><p><strong>Hallo</strong> <em>Welt</em></p>');
    expect(html).toContain('<h2>Titel</h2>');
    expect(html).toContain('<strong>Hallo</strong>');
    expect(html).toContain('<em>Welt</em>');
  });

  it('removes script tags and javascript urls', () => {
    const html = sanitizeRichTextHtml('<script>alert(1)</script><a href="javascript:alert(1)">Klick</a>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('alert(1)');
  });

  it('preserves safe links and table cells', () => {
    const html = sanitizeRichTextHtml('<table><tr><td colspan="2"><a href="/impressum">Impressum</a></td></tr></table>');
    expect(html).toContain('<td colspan="2">');
    expect(html).toContain('<a href="/impressum">Impressum</a>');
  });
});
