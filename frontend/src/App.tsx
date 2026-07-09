import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PlatformProvider } from '@/contexts/PlatformProvider';
import { TenantProvider } from '@/contexts/TenantProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/StaffLayout';
import { OrderPage } from '@/pages/OrderPage';
import { OrderStatusPage } from '@/pages/OrderStatusPage';
import { PickupBoardPage } from '@/pages/PickupBoardPage';
import { ContactPage } from '@/pages/ContactPage';
import { LegalPage } from '@/pages/LegalPage';
import { LoginPage } from '@/pages/staff/LoginPage';
import { DashboardPage } from '@/pages/staff/DashboardPage';
import { KitchenPage } from '@/pages/staff/KitchenPage';
import { AbholungPage } from '@/pages/staff/AbholungPage';
import { BestellungPage } from '@/pages/staff/BestellungPage';
import { OrdersPage } from '@/pages/staff/OrdersPage';
import { AdminShell } from '@/pages/admin/AdminShell';
import { AdminRoute } from '@/components/AdminLayout';
import { SetupWizardPage } from '@/pages/admin/SetupWizardPage';
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
import { ImpersonationBanner } from '@/components/ImpersonationBanner';

export default function App() {
  return (
    <ThemeProvider>
      <PlatformProvider>
        <TenantProvider>
          <AuthProvider>
          <ImpersonationBanner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<OrderPage />} />
              <Route path="/kontakt" element={<ContactPage />} />
              <Route path="/:legalSlug" element={<LegalPage />} />
              <Route path="/status" element={<OrderStatusPage />} />
              <Route path="/status/:lookupToken" element={<OrderStatusPage />} />
              <Route path="/abholboard" element={<PickupBoardPage />} />

              <Route path="/mitarbeiter/login" element={<LoginPage />} />
              <Route path="/mitarbeiter" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/mitarbeiter/bestellungen" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
              <Route path="/mitarbeiter/kueche" element={<ProtectedRoute><KitchenPage /></ProtectedRoute>} />
              <Route path="/mitarbeiter/abholung" element={<ProtectedRoute><AbholungPage /></ProtectedRoute>} />
              <Route path="/mitarbeiter/bestellung" element={<ProtectedRoute><BestellungPage /></ProtectedRoute>} />

              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/admin/einrichtung" element={<AdminRoute><SetupWizardPage /></AdminRoute>} />
              <Route path="/admin/*" element={<AdminShell />} />

              <Route path="/platform/login" element={
                <PlatformAuthProvider><PlatformLoginPage /></PlatformAuthProvider>
              } />
              <Route path="/platform" element={
                <PlatformAuthProvider><PlatformShell /></PlatformAuthProvider>
              }>
                <Route index element={<PlatformDashboardPage />} />
                <Route path="mandanten" element={<PlatformTenantsPage />} />
                <Route path="mandanten/:id" element={<PlatformTenantDetailPage />} />
                <Route path="benutzer" element={<PlatformUsersPage />} />
                <Route path="einstellungen" element={<PlatformSettingsPage />} />
                <Route path="logs" element={<PlatformLogsPage />} />
                <Route path="monitoring" element={<PlatformMonitoringPage />} />
                <Route path="health" element={<PlatformHealthPage />} />
                <Route path="backups" element={<PlatformBackupsPage />} />
              </Route>

              {/* Legacy-Weiterleitungen */}
              <Route path="/mitarbeiter/kasse" element={<Navigate to="/mitarbeiter/abholung" replace />} />
              <Route path="/mitarbeiter/lokale-kasse" element={<Navigate to="/mitarbeiter/bestellung" replace />} />
              <Route path="/mitarbeiter/verein" element={<Navigate to="/admin/verein" replace />} />
              <Route path="/mitarbeiter/speisen" element={<Navigate to="/admin/speisen" replace />} />
              <Route path="/mitarbeiter/veranstaltungen" element={<Navigate to="/admin/veranstaltungen" replace />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          </AuthProvider>
        </TenantProvider>
      </PlatformProvider>
    </ThemeProvider>
  );
}
