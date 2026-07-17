export type SeoCluster = 'software' | 'organisation' | 'veranstaltungen';

export type FaqCategoryId =
  | 'allgemein'
  | 'kosten-open-source'
  | 'mandant-start'
  | 'bestaellung-ablauf'
  | 'zahlung'
  | 'helfer-alltag'
  | 'technik-hosting'
  | 'datenschutz';

export interface SeoFaqItem {
  q: string;
  a: string;
  category?: FaqCategoryId;
}

export interface FaqCategory {
  id: FaqCategoryId;
  title: string;
  description: string;
}

export interface SeoSectionTable {
  headers: string[];
  rows: string[][];
}

export interface SeoSection {
  heading: string;
  body: string;
  bullets?: string[];
  table?: SeoSectionTable;
}

export interface SeoLandingPage {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  cluster: SeoCluster;
  keywords: string[];
  intro: string;
  sections: SeoSection[];
  faqs: SeoFaqItem[];
  relatedSlugs: string[];
  cta: { title: string; subtitle: string };
}

export interface SeoStaticPage {
  path: string;
  title: string;
  priority?: number;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
}
