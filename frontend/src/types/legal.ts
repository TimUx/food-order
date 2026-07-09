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

export interface LegalModuleConfig {
  appendClubContactToImprint: boolean;
  showFooterLinks: boolean;
  showNotificationLinks: boolean;
}
