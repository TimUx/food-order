import { Routes, Route, Navigate } from 'react-router-dom';
import { PlatformAuthProvider } from '@/contexts/PlatformAuthContext';
import { PlatformShell } from '@/pages/platform/PlatformShell';
import { PlatformLoginPage } from '@/pages/platform/PlatformLoginPage';
import { PlatformDashboardPage } from '@/pages/platform/PlatformDashboardPage';
import { PlatformTenantsPage } from '@/pages/platform/PlatformTenantsPage';
import { PlatformTenantDetailPage } from '@/pages/platform/PlatformTenantDetailPage';
import { PlatformSettingsPage } from '@/pages/platform/PlatformSettingsPage';
import { PlatformMailPage } from '@/pages/platform/PlatformMailPage';
import { PlatformUsersPage } from '@/pages/platform/PlatformUsersPage';
import { PlatformLogsPage } from '@/pages/platform/PlatformLogsPage';
import { PlatformMonitoringPage } from '@/pages/platform/PlatformMonitoringPage';
import { PlatformHealthPage } from '@/pages/platform/PlatformHealthPage';
import { PlatformBackupsPage } from '@/pages/platform/PlatformBackupsPage';
import { PlatformApplicationsPage } from '@/pages/platform/PlatformApplicationsPage';
import { PlatformApplicationDetailPage } from '@/pages/platform/PlatformApplicationDetailPage';
import { PlatformLegalAdminPage } from '@/pages/platform/PlatformLegalAdminPage';
import { PlatformDomainsPage } from '@/pages/platform/PlatformDomainsPage';
import { PlatformNotFoundPage } from '@/pages/errors/PlatformNotFoundPage';
import { MaintenanceGate } from '@/components/MaintenanceGate';

/** Plattformadministration unter app.&lt;platform-domain&gt; */
export function AppRoutes() {
  return (
    <MaintenanceGate>
      <Routes>
        <Route path="/" element={<Navigate to="/platform" replace />} />
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
          <Route path="email" element={<PlatformMailPage />} />
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
