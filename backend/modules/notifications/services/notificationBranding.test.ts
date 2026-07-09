import { describe, it, expect } from 'vitest';
import { defaultNotificationConfig } from '../config';
import { resolveEmailBranding, wrapEmailHtml } from './notificationBranding';

describe('notificationBranding', () => {
  it('merges tenant branding overrides', () => {
    const branding = resolveEmailBranding({
      ...defaultNotificationConfig,
      branding: {
        primaryColor: '#ff0000',
        footerText: 'Feuerwehr Musterstadt',
        signature: 'Mit freundlichen Grüßen',
      },
    });

    expect(branding.primaryColor).toBe('#ff0000');
    expect(branding.footerText).toBe('Feuerwehr Musterstadt');
    expect(branding.signatureText).toBe('Mit freundlichen Grüßen');
  });

  it('wraps email HTML with logo and footer', () => {
    const branding = resolveEmailBranding({
      ...defaultNotificationConfig,
      branding: {
        logoUrl: 'https://example.de/logo.png',
        footerText: 'Footer',
        signature: 'Signatur',
      },
    });

    const html = wrapEmailHtml('<p>Inhalt</p>', branding);
    expect(html).toContain('logo.png');
    expect(html).toContain('Footer');
    expect(html).toContain('Signatur');
    expect(html).toContain('Inhalt');
  });

  it('escapes HTML in signature', () => {
    const branding = resolveEmailBranding({
      ...defaultNotificationConfig,
      branding: { signature: '<script>alert(1)</script>' },
    });

    const html = wrapEmailHtml('<p>Test</p>', branding);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
