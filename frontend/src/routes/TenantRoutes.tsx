import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { StaffArea } from '@/components/StaffArea';
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
const StaffFoodAvailabilityPage = lazy(() =>
  import('@/pages/staff/StaffFoodAvailabilityPage').then((m) => ({ default: m.StaffFoodAvailabilityPage }))
);
const AdminShell = lazy(() =>
  import('@/pages/admin/AdminShell').then((m) => ({ default: m.AdminShell }))
);
const AdminUiScope = lazy(() =>
  import('@/pages/admin/AdminShell').then((m) => ({ default: m.AdminUiScope }))
);
const SetupWizardPage = lazy(() =>
  import('@/pages/admin/SetupWizardPage').then((m) => ({ default: m.SetupWizardPage }))
);
const AdminProfilePage = lazy(() =>
  import('@/pages/admin/AdminProfilePage').then((m) => ({ default: m.AdminProfilePage }))
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
        <Route path="/" element={<Navigate to="/public" replace />} />
        <Route path="/public" element={<OrderPage />} />
        <Route path="/kontakt" element={<ContactPage />} />
        <Route path="/recht/:legalSlug" element={<LegalPage />} />
        <Route path="/status" element={<OrderStatusPage />} />
        <Route path="/status/:lookupToken" element={<OrderStatusPage />} />
        <Route path="/abholboard" element={<Lazy><PickupBoardPage /></Lazy>} />

        <Route path="/service/login" element={<Lazy><LoginPage /></Lazy>} />
        <Route path="/service" element={<StaffArea />}>
          <Route index element={<Lazy><DashboardPage /></Lazy>} />
          <Route path="bestellungen" element={<Lazy><OrdersPage /></Lazy>} />
          <Route path="kueche" element={<Lazy><KitchenPage /></Lazy>} />
          <Route path="abholung" element={<Lazy><AbholungPage /></Lazy>} />
          <Route path="bestellung" element={<Lazy><BestellungPage /></Lazy>} />
          <Route path="speisen" element={<Lazy><StaffFoodAvailabilityPage /></Lazy>} />
        </Route>

        <Route path="/admin/login" element={<Lazy><LoginPage /></Lazy>} />
        <Route path="/admin/profil" element={<Lazy><AdminRoute><AdminUiScope><AdminProfilePage /></AdminUiScope></AdminRoute></Lazy>} />
        <Route path="/admin/einrichtung" element={<Lazy><AdminRoute><AdminUiScope><SetupWizardPage /></AdminUiScope></AdminRoute></Lazy>} />
        <Route path="/admin/*" element={<Lazy><AdminShell /></Lazy>} />

        <Route path="/platform/*" element={<Navigate to="/public" replace />} />

        {['impressum', 'datenschutz', 'agb', 'widerruf'].map((slug) => (
          <Route key={slug} path={`/${slug}`} element={<Navigate to={`/recht/${slug}`} replace />} />
        ))}

        <Route path="/service/kasse" element={<Navigate to="/service/abholung" replace />} />
        <Route path="/service/lokale-kasse" element={<Navigate to="/service/bestellung" replace />} />
        <Route path="/service/verein" element={<Navigate to="/admin/verein" replace />} />
        <Route path="/service/veranstaltungen" element={<Navigate to="/admin/veranstaltungen" replace />} />

        <Route path="*" element={<TenantNotFoundPage />} />
      </Routes>
    </MaintenanceGate>
  );
}
