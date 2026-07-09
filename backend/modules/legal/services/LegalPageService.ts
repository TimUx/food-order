import { randomUUID } from 'crypto';
import { prisma } from '../../../src/config/database';
import { settingsService } from '../../../src/platform/bootstrap';
import { requireTenantId } from '../../../src/platform/tenant/tenantScope';
import { AppError } from '../../../src/middleware/errorHandler';
import type { PublicLegalLink, PublicLegalPage } from '../../../src/platform/extension-points';
import { CORE_CLUB_NAMESPACE } from '../../../src/platform/settings/SettingsNamespaces';
import {
  defaultLegalConfig,
  LEGAL_PAGE_DEFAULTS,
  LEGAL_PAGE_TYPES,
  type LegalConfig,
  type LegalPageType,
} from '../config';
import { sanitizeRichTextHtml } from './HtmlSanitizer';

export interface AdminLegalPage {
  pageType: LegalPageType;
  title: string;
  slug: string;
  enabled: boolean;
  published: boolean;
  contentHtml: string;
  hasContent: boolean;
  isPubliclyVisible: boolean;
  updatedAt?: string;
}

export interface UpdateLegalPageInput {
  title?: string;
  slug?: string;
  enabled?: boolean;
  published?: boolean;
  contentHtml?: string;
}

interface LegalPageRow {
  pageType: string;
  title: string;
  slug: string;
  enabled: boolean;
  published: boolean;
  contentHtml: string;
  updatedAt: Date;
  createdAt: Date;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isLegalPageType(value: string): value is LegalPageType {
  return (LEGAL_PAGE_TYPES as readonly string[]).includes(value);
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9-_/]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^-+|-+$/g, '')
    .replace(/\/$/, '');
}

function hasContent(contentHtml: string): boolean {
  return contentHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
}

async function getConfig(): Promise<LegalConfig> {
  const values = await settingsService.getDecryptedValues('module.legal');
  return {
    appendClubContactToImprint: values.appendClubContactToImprint !== false,
    showFooterLinks: values.showFooterLinks !== false,
    showNotificationLinks: values.showNotificationLinks !== false,
  };
}

async function buildContactBlockHtml(): Promise<string> {
  const club = await settingsService.getDecryptedValues(CORE_CLUB_NAMESPACE);
  const lines = [
    club.clubName ? `<strong>${escapeHtml(String(club.clubName))}</strong>` : '',
    club.contactName ? `Ansprechpartner: ${escapeHtml(String(club.contactName))}` : '',
    club.email ? `E-Mail: <a href="mailto:${escapeHtml(String(club.email))}">${escapeHtml(String(club.email))}</a>` : '',
    club.phone ? `Telefon: <a href="tel:${escapeHtml(String(club.phone))}">${escapeHtml(String(club.phone))}</a>` : '',
    club.address ? `Adresse: ${escapeHtml(String(club.address))}` : '',
    club.website ? `<a href="${escapeHtml(String(club.website))}" target="_blank" rel="noopener noreferrer">${escapeHtml(String(club.website))}</a>` : '',
  ].filter(Boolean);

  if (lines.length === 0) return '';

  return [
    '<section>',
    '<h2>Kontakt</h2>',
    ...lines.map((line) => `<p>${line}</p>`),
    '</section>',
  ].join('');
}

function mapAdminPage(
  row: {
    pageType: string;
    title: string;
    slug: string;
    enabled: boolean;
    published: boolean;
    contentHtml: string;
    updatedAt: Date;
  },
  config: LegalConfig
): AdminLegalPage {
  const visible = row.enabled && row.published && hasContent(row.contentHtml);
  return {
    pageType: row.pageType as LegalPageType,
    title: row.title,
    slug: row.slug,
    enabled: row.enabled,
    published: row.published,
    contentHtml: row.contentHtml,
    hasContent: hasContent(row.contentHtml),
    isPubliclyVisible: config.showFooterLinks && visible ? true : visible,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function renderPublicHtml(row: { pageType: string; contentHtml: string }, config: LegalConfig): Promise<string> {
  if (row.pageType === 'imprint' && config.appendClubContactToImprint) {
    const contactBlock = await buildContactBlockHtml();
    if (contactBlock) {
      return `${row.contentHtml}\n${contactBlock}`;
    }
  }
  return row.contentHtml;
}

function mapRow(raw: Record<string, unknown>): LegalPageRow {
  return {
    pageType: String(raw.page_type),
    title: String(raw.title),
    slug: String(raw.slug),
    enabled: Boolean(raw.enabled),
    published: Boolean(raw.published),
    contentHtml: String(raw.content_html ?? ''),
    updatedAt: new Date(String(raw.updated_at)),
    createdAt: new Date(String(raw.created_at)),
  };
}

async function queryRows(sql: string, params: unknown[] = []): Promise<LegalPageRow[]> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params);
  return rows.map(mapRow);
}

async function queryOne(sql: string, params: unknown[] = []): Promise<LegalPageRow | null> {
  const rows = await queryRows(sql, params);
  return rows[0] ?? null;
}

export const legalPageService = {
  async ensureDefaults(): Promise<void> {
    const tenantId = requireTenantId();
    for (const pageType of LEGAL_PAGE_TYPES) {
      const defaults = LEGAL_PAGE_DEFAULTS[pageType];
      await prisma.$executeRawUnsafe(
        `INSERT INTO legal_pages (id, tenant_id, page_type, title, slug, enabled, published, content_html, updated_at, created_at)
         VALUES ($1, $2, $3, $4, $5, false, false, '', NOW(), NOW())
         ON CONFLICT (tenant_id, page_type) DO NOTHING`,
        randomUUID(),
        tenantId,
        pageType,
        defaults.title,
        defaults.slug
      );
    }
  },

  async listAdminPages(): Promise<AdminLegalPage[]> {
    await this.ensureDefaults();
    const tenantId = requireTenantId();
    const rows = await queryRows('SELECT * FROM legal_pages WHERE tenant_id = $1 ORDER BY created_at ASC', [tenantId]);
    const config = await getConfig();
    return rows
      .filter((row) => isLegalPageType(row.pageType))
      .map((row) => mapAdminPage(row, config));
  },

  async updatePage(pageType: LegalPageType, input: UpdateLegalPageInput): Promise<AdminLegalPage> {
    await this.ensureDefaults();
    const tenantId = requireTenantId();
    const existing = await queryOne('SELECT * FROM legal_pages WHERE tenant_id = $1 AND page_type = $2', [tenantId, pageType]);
    if (!existing) throw new AppError(404, 'Rechtliche Seite nicht gefunden');

    const nextSlug = input.slug !== undefined ? normalizeSlug(input.slug) : existing.slug;
    if (!nextSlug) throw new AppError(400, 'Bitte eine gueltige URL angeben');

    const nextTitle = (input.title ?? existing.title).trim();
    if (!nextTitle) throw new AppError(400, 'Bitte einen Titel angeben');

    const duplicate = await queryOne(
      'SELECT * FROM legal_pages WHERE tenant_id = $1 AND slug = $2 AND page_type <> $3',
      [tenantId, nextSlug, pageType]
    );
    if (duplicate) throw new AppError(400, 'Diese URL wird bereits von einer anderen Seite verwendet');

    const sanitizedHtml = input.contentHtml !== undefined
      ? sanitizeRichTextHtml(input.contentHtml)
      : existing.contentHtml;

    const row = await queryOne(
      `UPDATE legal_pages
       SET title = $3,
           slug = $4,
           enabled = $5,
           published = $6,
           content_html = $7,
           updated_at = NOW()
       WHERE tenant_id = $1 AND page_type = $2
       RETURNING *`,
      [
        tenantId,
        pageType,
        nextTitle,
        nextSlug,
        input.enabled ?? existing.enabled,
        input.published ?? existing.published,
        sanitizedHtml,
      ]
    );
    if (!row) throw new AppError(500, 'Rechtliche Seite konnte nicht gespeichert werden');

    const config = await getConfig();
    return mapAdminPage(row, config);
  },

  async previewHtml(pageType: LegalPageType, inputHtml: string): Promise<string> {
    const config = await getConfig();
    return renderPublicHtml(
      {
        pageType,
        contentHtml: sanitizeRichTextHtml(inputHtml),
      },
      config
    );
  },

  async listPublicLinks(): Promise<PublicLegalLink[]> {
    const config = await getConfig();
    if (!config.showFooterLinks) return [];

    const tenantId = requireTenantId();
    const rows = await queryRows(
      'SELECT * FROM legal_pages WHERE tenant_id = $1 AND enabled = true AND published = true ORDER BY created_at ASC',
      [tenantId]
    );

    return rows
      .filter((row) => isLegalPageType(row.pageType) && hasContent(row.contentHtml))
      .map((row) => ({
        pageType: row.pageType as LegalPageType,
        title: row.title,
        slug: row.slug,
        path: `/${row.slug}`,
      }));
  },

  async getPublicPageBySlug(slug: string): Promise<PublicLegalPage | null> {
    const tenantId = requireTenantId();
    const row = await queryOne('SELECT * FROM legal_pages WHERE tenant_id = $1 AND slug = $2', [tenantId, normalizeSlug(slug)]);
    if (!row || !isLegalPageType(row.pageType)) return null;
    if (!row.enabled || !row.published || !hasContent(row.contentHtml)) return null;

    const config = await getConfig();
    const html = await renderPublicHtml(row, config);

    return {
      pageType: row.pageType,
      title: row.title,
      slug: row.slug,
      path: `/${row.slug}`,
      html,
      updatedAt: row.updatedAt.toISOString(),
    };
  },

  async notificationLinksEnabled(): Promise<boolean> {
    const config = await getConfig();
    return config.showNotificationLinks;
  },

  hasRenderableContent(contentHtml: string): boolean {
    return hasContent(contentHtml);
  },
};
