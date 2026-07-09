import { Routes, Route } from 'react-router-dom';
import { PlatformHomePage } from '@/pages/platform/PlatformHomePage';
import { PlatformFeaturesPage } from '@/pages/platform/PlatformFeaturesPage';
import { PlatformDocsPage } from '@/pages/platform/PlatformDocsPage';
import { PlatformDownloadPage } from '@/pages/platform/PlatformDownloadPage';
import { PlatformStatusPublicPage } from '@/pages/platform/PlatformStatusPublicPage';
import { PlatformScreenshotsPage } from '@/pages/platform/PlatformScreenshotsPage';
import { PlatformOpenSourcePage } from '@/pages/platform/PlatformOpenSourcePage';
import { PlatformAboutProjectPage } from '@/pages/platform/PlatformAboutProjectPage';
import { PlatformAboutDeveloperPage } from '@/pages/platform/PlatformAboutDeveloperPage';
import { PlatformForClubsPage } from '@/pages/platform/PlatformForClubsPage';
import { PlatformFaqPage } from '@/pages/platform/PlatformFaqPage';
import { PlatformContactPage } from '@/pages/platform/PlatformContactPage';
import { PlatformApplyPage } from '@/pages/platform/PlatformApplyPage';
import { PlatformApplyConfirmPage } from '@/pages/platform/PlatformApplyConfirmPage';
import { PlatformDynamicLegalPage } from '@/pages/platform/PlatformDynamicLegalPage';
import { PlatformNotFoundPage } from '@/pages/errors/PlatformNotFoundPage';
import { MaintenanceGate } from '@/components/MaintenanceGate';

/** Öffentliche Homepage unter www.&lt;platform-domain&gt; */
export function WwwRoutes() {
  return (
    <MaintenanceGate>
      <Routes>
        <Route path="/" element={<PlatformHomePage />} />
        <Route path="/funktionen" element={<PlatformFeaturesPage />} />
        <Route path="/screenshots" element={<PlatformScreenshotsPage />} />
        <Route path="/open-source" element={<PlatformOpenSourcePage />} />
        <Route path="/ueber-das-projekt" element={<PlatformAboutProjectPage />} />
        <Route path="/ueber-den-entwickler" element={<PlatformAboutDeveloperPage />} />
        <Route path="/fuer-vereine" element={<PlatformForClubsPage />} />
        <Route path="/mandant-beantragen" element={<PlatformApplyPage />} />
        <Route path="/mandant-beantragen/bestaetigung" element={<PlatformApplyConfirmPage />} />
        <Route path="/faq" element={<PlatformFaqPage />} />
        <Route path="/kontakt" element={<PlatformContactPage />} />
        <Route path="/rechtliches/:slug" element={<PlatformDynamicLegalPage />} />
        <Route path="/dokumentation" element={<PlatformDocsPage />} />
        <Route path="/download" element={<PlatformDownloadPage />} />
        <Route path="/plattform-status" element={<PlatformStatusPublicPage />} />
        <Route path="*" element={<PlatformNotFoundPage />} />
      </Routes>
    </MaintenanceGate>
  );
}
