import { Alert, Box, CircularProgress } from '@mui/material';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminUi } from '@/contexts/AdminUiContext';
import { AdminLayout } from '@/components/AdminLayout';
import { canAccessPermission } from '@/utils/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { GenericSettingsPage } from '@/pages/admin/GenericSettingsPage';
import { renderSettingsPage } from '@/admin/settingsPages';
import { renderBuiltinPage, renderDeveloperPage, renderReportPage } from '@/admin/builtinPages';
import type { AdminPageDefinition } from '@/types/adminUi';

const LEGACY_REDIRECTS: Record<string, string> = {
  '/admin/module/payment': '/admin/payment',
  '/admin/email': '/admin/settings/module.notifications',
  '/admin/email-settings': '/admin/settings/module.notifications',
};

function PageNotFound() {
  return (
    <AdminLayout title="Seite nicht gefunden">
      <Alert severity="warning">Diese Admin-Seite ist nicht registriert oder nicht verfügbar.</Alert>
    </AdminLayout>
  );
}

function AccessDenied() {
  return (
    <AdminLayout title="Keine Berechtigung">
      <Alert severity="error">Sie haben keine Berechtigung für diese Seite.</Alert>
    </AdminLayout>
  );
}

function renderPage(page: AdminPageDefinition) {
  switch (page.pageType) {
    case 'dashboard':
      return <AdminDashboardPage />;
    case 'settings': {
      const custom = renderSettingsPage(page.namespace);
      if (custom) return custom;
      return <GenericSettingsPage namespace={page.namespace} title={page.label} />;
    }
    case 'builtin':
    case 'modules':
      return renderBuiltinPage(page.componentId) ?? <PageNotFound />;
    case 'report':
      return renderReportPage(page.componentId, { label: page.label, description: page.description });
    case 'developer':
      return renderDeveloperPage(page.componentId, { label: page.label, description: page.description });
    default:
      return <PageNotFound />;
  }
}

export function DynamicAdminPage() {
  const location = useLocation();
  const { user } = useAuth();
  const { loading, error, findPageByPath, catalog } = useAdminUi();

  const legacyTarget = LEGACY_REDIRECTS[location.pathname];
  if (legacyTarget) {
    return <Navigate to={legacyTarget} replace />;
  }

  if (loading && !catalog) {
    return (
      <AdminLayout title="Administration">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Administration">
        <Alert severity="error">{error}</Alert>
      </AdminLayout>
    );
  }

  const page = findPageByPath(location.pathname);
  if (!page) return <PageNotFound />;

  if (!canAccessPermission(user, page.requiredPermission)) {
    return <AccessDenied />;
  }

  return <>{renderPage(page)}</>;
}
