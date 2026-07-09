export type LegalPageType = 'imprint' | 'privacy' | 'terms' | 'withdrawal';

export interface PublicLegalLink {
  pageType: LegalPageType;
  title: string;
  slug: string;
  path: string;
}

export interface PublicLegalPage extends PublicLegalLink {
  html: string;
  updatedAt?: string;
}

export interface LegalContentService {
  listPublicLinks(): Promise<PublicLegalLink[]>;
  getPublicPageBySlug(slug: string): Promise<PublicLegalPage | null>;
}
