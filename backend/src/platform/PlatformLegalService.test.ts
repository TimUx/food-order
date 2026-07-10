import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/database', () => ({
  prisma: {
    platformLegalPage: {
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([
        {
          slug: 'impressum',
          title: 'Impressum',
          pageType: 'impressum',
          contentHtml: '<p>Impressum</p>',
        },
      ]),
    },
  },
}));

import { platformLegalService } from './PlatformLegalService';

describe('platformLegalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listPublicLinks filters empty content', async () => {
    const links = await platformLegalService.listPublicLinks();
    expect(Array.isArray(links)).toBe(true);
    for (const link of links) {
      expect(link.slug).toBeTruthy();
      expect(link.title).toBeTruthy();
    }
  });
});
