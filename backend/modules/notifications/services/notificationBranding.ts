import type { NotificationConfig } from '../config';
import { resolveTenantBrandingDefaults, resolveTenantPublicBaseUrl } from './notificationTenantContext';

export type EmailBrandingVars = {
  baseUrl: string;
  logoUrl: string;
  logoBlockHtml: string;
  primaryColor: string;
  footerText: string;
  signatureHtml: string;
  signatureText: string;
};

export function resolveEmailBranding(config: NotificationConfig): EmailBrandingVars {
  const tenantDefaults = resolveTenantBrandingDefaults();
  const branding = config.branding ?? {};
  const baseUrl = resolveTenantPublicBaseUrl();
  const primaryColor = String(branding.primaryColor ?? '#1976d2');
  const logoUrl = String(branding.logoUrl ?? tenantDefaults.logoUrl ?? '').trim();
  const footerText = String(branding.footerText ?? '').trim();
  const signature = String(branding.signature ?? '').trim();

  const logoBlockHtml = logoUrl
    ? `<p style="text-align: center;"><img src="${logoUrl}" alt="Logo" style="max-height: 64px; max-width: 200px;" /></p>`
    : '';

  const signatureHtml = signature
    ? `<p style="margin-top: 16px; font-size: 0.9em; color: #666;">${escapeHtml(signature).replace(/\r?\n/g, '<br>')}</p>`
    : '';

  return {
    baseUrl,
    logoUrl,
    logoBlockHtml,
    primaryColor,
    footerText,
    signatureHtml,
    signatureText: signature,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function wrapEmailHtml(innerHtml: string, branding: EmailBrandingVars): string {
  const footer = branding.footerText
    ? `<p style="font-size: 0.8em; color: #666; margin-top: 24px;">${escapeHtml(branding.footerText)}</p>`
    : '';
  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
  ${branding.logoBlockHtml}
  ${innerHtml}
  ${branding.signatureHtml}
  ${footer}
</div>`.trim();
}
