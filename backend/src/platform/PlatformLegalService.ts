import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

const DEFAULT_PAGES = [
  { pageType: 'impressum', title: 'Impressum', slug: 'impressum' },
  { pageType: 'datenschutz', title: 'Datenschutz', slug: 'datenschutz' },
  { pageType: 'nutzungsbedingungen', title: 'Nutzungsbedingungen', slug: 'nutzungsbedingungen' },
] as const;

function normalizeSlug(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export const platformLegalService = {
  async ensureDefaults(): Promise<void> {
    for (const page of DEFAULT_PAGES) {
      await prisma.platformLegalPage.upsert({
        where: { pageType: page.pageType },
        update: {},
        create: {
          pageType: page.pageType,
          title: page.title,
          slug: page.slug,
          enabled: true,
          published: false,
          contentHtml: '',
        },
      });
    }
  },

  async listPublicLinks(): Promise<Array<{ slug: string; title: string; pageType: string }>> {
    await this.ensureDefaults();
    const rows = await prisma.platformLegalPage.findMany({
      where: { enabled: true, published: true },
      orderBy: { pageType: 'asc' },
      select: { slug: true, title: true, pageType: true, contentHtml: true },
    });
    return rows
      .filter((r) => r.contentHtml.trim().length > 0)
      .map(({ slug, title, pageType }) => ({ slug, title, pageType }));
  },

  async getPublicBySlug(slug: string) {
    const normalized = normalizeSlug(slug);
    const page = await prisma.platformLegalPage.findFirst({
      where: { slug: normalized, enabled: true, published: true },
    });
    if (!page || !page.contentHtml.trim()) {
      throw new AppError(404, 'Seite nicht gefunden');
    }
    return {
      slug: page.slug,
      title: page.title,
      pageType: page.pageType,
      contentHtml: page.contentHtml,
    };
  },

  async listAdmin() {
    await this.ensureDefaults();
    return prisma.platformLegalPage.findMany({ orderBy: { pageType: 'asc' } });
  },

  async updatePage(
    pageType: string,
    data: { title?: string; slug?: string; enabled?: boolean; published?: boolean; contentHtml?: string }
  ) {
    const existing = await prisma.platformLegalPage.findUnique({ where: { pageType } });
    if (!existing) throw new AppError(404, 'Rechtsseite nicht gefunden');

    if (data.slug && data.slug !== existing.slug) {
      const slug = normalizeSlug(data.slug);
      const conflict = await prisma.platformLegalPage.findFirst({
        where: { slug, pageType: { not: pageType } },
      });
      if (conflict) throw new AppError(409, 'Slug bereits vergeben');
      data.slug = slug;
    }

    return prisma.platformLegalPage.update({
      where: { pageType },
      data: {
        title: data.title,
        slug: data.slug,
        enabled: data.enabled,
        published: data.published,
        contentHtml: data.contentHtml,
      },
    });
  },
};
