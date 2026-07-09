import type { LegalContentService } from './LegalContentService';

class LegalContentServiceRegistryImpl {
  private service: LegalContentService | null = null;

  register(service: LegalContentService): void {
    this.service = service;
  }

  unregister(): void {
    this.service = null;
  }

  getService(): LegalContentService | null {
    return this.service;
  }

  isAvailable(): boolean {
    return this.service !== null;
  }

  async listPublicLinks() {
    if (!this.service) return [];
    return this.service.listPublicLinks();
  }

  async getPublicPageBySlug(slug: string) {
    if (!this.service) return null;
    return this.service.getPublicPageBySlug(slug);
  }
}

export const legalContentServiceRegistry = new LegalContentServiceRegistryImpl();
