import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { ProtectedRoute } from '@/components/StaffLayout';
import { AdminRoute } from '@/components/AdminLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { MaintenanceGate } from '@/components/MaintenanceGate';

// Öffentliche Seiten eager (schneller First Paint)
import { OrderPage } from '@/pages/OrderPage';
import { OrderStatusPage } from '@/pages/OrderStatusPage';
import { ContactPage } from '@/pages/ContactPage';
import { LegalPage } from '@/pages/LegalPage';
import { TenantNotFoundPage } from '@/pages/errors/TenantNotFoundPage';

// Staff & Admin lazy (Code Splitting)
const PickupBoardPage = lazy(() =>
  import('@/pages/PickupBoardPage').then((m) => ({ default: m.PickupBoardPage }))
);
const LoginPage = lazy(() =>
  import('@/pages/staff/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const DashboardPage = lazy(() =>
  import('@/pages/staff/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const KitchenPage = lazy(() =>
  import('@/pages/staff/KitchenPage').then((m) => ({ default: m.KitchenPage }))
);
const AbholungPage = lazy(() =>
  import('@/pages/staff/AbholungPage').then((m) => ({ default: m.AbholungPage }))
);
const BestellungPage = lazy(() =>
  import('@/pages/staff/BestellungPage').then((m) => ({ default: m.BestellungPage }))
);
const OrdersPage = lazy(() =>
  import('@/pages/staff/OrdersPage').then((m) => ({ default: m.OrdersPage }))
);
const AdminShell = lazy(() =>
  import('@/pages/admin/AdminShell').then((m) => ({ default: m.AdminShell }))
);
const SetupWizardPage = lazy(() =>
  import('@/pages/admin/SetupWizardPage').then((m) => ({ default: m.SetupWizardPage }))
);

function PageLoader() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
      <CircularProgress />
    </Box>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export function TenantRoutes() {
  return (
    <MaintenanceGate>
      <BrandingHead />
      <Routes>
        <Route path="/" element={<OrderPage />} />
        <Route path="/kontakt" element={<ContactPage />} />
        <Route path="/recht/:legalSlug" element={<LegalPage />} />
        <Route path="/status" element={<OrderStatusPage />} />
        <Route path="/status/:lookupToken" element={<OrderStatusPage />} />
        <Route path="/abholboard" element={<Lazy><PickupBoardPage /></Lazy>} />

        <Route path="/mitarbeiter/login" element={<Lazy><LoginPage /></Lazy>} />
        <Route path="/mitarbeiter" element={<Lazy><ProtectedRoute><DashboardPage /></ProtectedRoute></Lazy>} />
        <Route path="/mitarbeiter/bestellungen" element={<Lazy><ProtectedRoute><OrdersPage /></ProtectedRoute></Lazy>} />
        <Route path="/mitarbeiter/kueche" element={<Lazy><ProtectedRoute><KitchenPage /></ProtectedRoute></Lazy>} />
        <Route path="/mitarbeiter/abholung" element={<Lazy><ProtectedRoute><AbholungPage /></ProtectedRoute></Lazy>} />
        <Route path="/mitarbeiter/bestellung" element={<Lazy><ProtectedRoute><BestellungPage /></ProtectedRoute></Lazy>} />

        <Route path="/admin/login" element={<Lazy><LoginPage /></Lazy>} />
        <Route path="/admin/einrichtung" element={<Lazy><AdminRoute><SetupWizardPage /></AdminRoute></Lazy>} />
        <Route path="/admin/*" element={<Lazy><AdminShell /></Lazy>} />

        <Route path="/platform/*" element={<Navigate to="/" replace />} />

        {['impressum', 'datenschutz', 'agb', 'widerruf'].map((slug) => (
          <Route key={slug} path={`/${slug}`} element={<Navigate to={`/recht/${slug}`} replace />} />
        ))}

        <Route path="/mitarbeiter/kasse" element={<Navigate to="/mitarbeiter/abholung" replace />} />
        <Route path="/mitarbeiter/lokale-kasse" element={<Navigate to="/mitarbeiter/bestellung" replace />} />
        <Route path="/mitarbeiter/verein" element={<Navigate to="/admin/verein" replace />} />
        <Route path="/mitarbeiter/speisen" element={<Navigate to="/admin/speisen" replace />} />
        <Route path="/mitarbeiter/veranstaltungen" element={<Navigate to="/admin/veranstaltungen" replace />} />

        <Route path="*" element={<TenantNotFoundPage />} />
      </Routes>
    </MaintenanceGate>
  );
}
