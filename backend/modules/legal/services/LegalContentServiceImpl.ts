import type { LegalContentService } from '../../../src/platform/extension-points';
import { legalPageService } from './LegalPageService';

export function createLegalContentService(): LegalContentService {
  return {
    async listPublicLinks() {
      return legalPageService.listPublicLinks();
    },
    async getPublicPageBySlug(slug: string) {
      return legalPageService.getPublicPageBySlug(slug);
    },
  };
}
