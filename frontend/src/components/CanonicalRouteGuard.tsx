import { useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useRouting } from '@/contexts/RoutingProvider';

const WWW_MARKETING_PREFIXES = [
  '/funktionen',
  '/screenshots',
  '/open-source',
  '/ueber-das-projekt',
  '/ueber-den-entwickler',
  '/fuer-vereine',
  '/mandant-beantragen',
  '/faq',
  '/kontakt',
  '/rechtliches',
  '/dokumentation',
  '/download',
  '/plattform-status',
];

function isWwwMarketingPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return WWW_MARKETING_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Erzwingt die kanonische Subdomain-Trennung:
 * www → Marketing, app → Plattformadministration.
 */
export function CanonicalRouteGuard({ children }: { children: ReactNode }) {
  const { routing } = useRouting();
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const suffix = `${location.search}${location.hash}`;

    if (routing.scope === 'www' && path.startsWith('/platform')) {
      const target = `${routing.appUrl}${path}${suffix}`;
      if (window.location.href !== target) {
        window.location.replace(target);
      }
      return;
    }

    if (routing.scope === 'app' && isWwwMarketingPath(path)) {
      const target = `${routing.wwwUrl}${path}${suffix}`;
      if (window.location.href !== target) {
        window.location.replace(target);
      }
    }
  }, [routing.scope, routing.appUrl, routing.wwwUrl, location.pathname, location.search, location.hash]);

  return <>{children}</>;
}
