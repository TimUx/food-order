import { useEffect } from 'react';
import { useRouting } from '@/contexts/RoutingProvider';
import { isPlatformSurfaceScope } from '@/types/routing';
import { useTenant } from '@/contexts/TenantProvider';
import { usePlatform } from '@/contexts/PlatformProvider';
import { getImageUrl } from '@/services/api';

const DEFAULT_DESCRIPTION =
  'FestManager ist eine moderne Open-Source-Plattform zur Organisation von Veranstaltungen – für Vereine, Schulen und gemeinnützige Organisationen.';

interface BrandingHeadProps {
  titleSuffix?: string;
  description?: string;
  path?: string;
}

function upsertMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

export function BrandingHead({ titleSuffix, description, path }: BrandingHeadProps) {
  const { routing } = useRouting();
  const { tenant } = useTenant();
  const { platform } = usePlatform();

  useEffect(() => {
    let title: string;
    let favicon: string | undefined;
    const desc = description ?? DEFAULT_DESCRIPTION;
    const origin =
      routing.scope === 'www'
        ? routing.wwwUrl
        : routing.scope === 'app'
          ? routing.appUrl
          : (routing.tenantUrl || routing.appUrl || (typeof window !== 'undefined' ? window.location.origin : ''));
    const pagePath = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
    const canonical = `${origin.replace(/\/$/, '')}${pagePath}`;

    if (isPlatformSurfaceScope(routing.scope)) {
      title = platform.name;
      favicon = undefined;
    } else if (routing.scope === 'tenant') {
      title = tenant.name;
      favicon = tenant.logoUrl ? getImageUrl(tenant.logoUrl) : undefined;
    } else {
      title = 'FestManager';
    }

    document.title = titleSuffix ? `${titleSuffix} · ${title}` : title;

    const link =
      document.querySelector<HTMLLinkElement>("link[rel='icon']") ??
      (() => {
        const el = document.createElement('link');
        el.rel = 'icon';
        document.head.appendChild(el);
        return el;
      })();
    link.href = favicon ?? '/favicon.svg';

    document.documentElement.lang = (
      routing.scope === 'tenant' ? tenant.locale : platform.defaultLocale ?? 'de-DE'
    ).split('-')[0];

    upsertMeta('description', desc);
    upsertMeta('og:title', document.title, 'property');
    upsertMeta('og:description', desc, 'property');
    upsertMeta('og:type', 'website', 'property');
    upsertMeta('og:url', canonical, 'property');
    upsertMeta('og:site_name', platform.name, 'property');
    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:title', document.title);
    upsertMeta('twitter:description', desc);

    let canonicalEl = document.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.rel = 'canonical';
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href = canonical;

    const existing = document.getElementById('fm-structured-data');
    existing?.remove();
    const script = document.createElement('script');
    script.id = 'fm-structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: platform.name,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: desc,
      url: canonical,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    });
    document.head.appendChild(script);
  }, [
    routing.scope,
    routing.wwwUrl,
    routing.appUrl,
    tenant.name,
    tenant.logoUrl,
    tenant.locale,
    platform.name,
    platform.defaultLocale,
    titleSuffix,
    description,
    path,
  ]);

  return null;
}
