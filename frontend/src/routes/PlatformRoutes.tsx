import { Routes, Route } from 'react-router-dom';
import { PlatformAuthProvider } from '@/contexts/PlatformAuthContext';
import { PlatformShell } from '@/pages/platform/PlatformShell';
import { PlatformLoginPage } from '@/pages/platform/PlatformLoginPage';
import { PlatformDashboardPage } from '@/pages/platform/PlatformDashboardPage';
import { PlatformTenantsPage } from '@/pages/platform/PlatformTenantsPage';
import { PlatformTenantDetailPage } from '@/pages/platform/PlatformTenantDetailPage';
import { PlatformSettingsPage } from '@/pages/platform/PlatformSettingsPage';
import { PlatformUsersPage } from '@/pages/platform/PlatformUsersPage';
import { PlatformLogsPage } from '@/pages/platform/PlatformLogsPage';
import { PlatformMonitoringPage } from '@/pages/platform/PlatformMonitoringPage';
import { PlatformHealthPage } from '@/pages/platform/PlatformHealthPage';
import { PlatformBackupsPage } from '@/pages/platform/PlatformBackupsPage';
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
import { PlatformApplicationsPage } from '@/pages/platform/PlatformApplicationsPage';
import { PlatformApplicationDetailPage } from '@/pages/platform/PlatformApplicationDetailPage';
import { PlatformLegalAdminPage } from '@/pages/platform/PlatformLegalAdminPage';
import { PlatformDomainsPage } from '@/pages/platform/PlatformDomainsPage';
import { PlatformNotFoundPage } from '@/pages/errors/PlatformNotFoundPage';
import { MaintenanceGate } from '@/components/MaintenanceGate';

export function PlatformRoutes() {
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
        <Route path="/platform/login" element={
          <PlatformAuthProvider><PlatformLoginPage /></PlatformAuthProvider>
        } />
        <Route path="/platform" element={
          <PlatformAuthProvider><PlatformShell /></PlatformAuthProvider>
        }>
          <Route index element={<PlatformDashboardPage />} />
          <Route path="mandanten" element={<PlatformTenantsPage />} />
          <Route path="mandanten/:id" element={<PlatformTenantDetailPage />} />
          <Route path="bewerbungen" element={<PlatformApplicationsPage />} />
          <Route path="bewerbungen/:id" element={<PlatformApplicationDetailPage />} />
          <Route path="rechtliches" element={<PlatformLegalAdminPage />} />
          <Route path="domains" element={<PlatformDomainsPage />} />
          <Route path="benutzer" element={<PlatformUsersPage />} />
          <Route path="einstellungen" element={<PlatformSettingsPage />} />
          <Route path="logs" element={<PlatformLogsPage />} />
          <Route path="monitoring" element={<PlatformMonitoringPage />} />
          <Route path="health" element={<PlatformHealthPage />} />
          <Route path="backups" element={<PlatformBackupsPage />} />
        </Route>
        <Route path="*" element={<PlatformNotFoundPage />} />
      </Routes>
    </MaintenanceGate>
  );
}
