import { Router } from 'express';
import {
  authenticatePlatform,
  loadPlatformUser,
  requirePlatformPermission,
} from '../../middleware/platformAuth';
import { PLATFORM_PERMISSIONS } from '../../platform/platformPermissions';
import { platformAuthController, platformController } from '../../controllers/platformController';
import { loginRateLimiter } from '../../middleware/rateLimit';
import { validateBody, validateParams } from '../../middleware/validation';
import {
  updateTenantApplicationStatusSchema,
  approveTenantApplicationSchema,
  updatePlatformLegalPageSchema,
  applicationIdParamSchema,
} from '../../validation/schemas';

const router = Router();

// Auth (öffentlich)
router.post('/auth/login', loginRateLimiter, platformAuthController.login);
router.post('/auth/logout', platformAuthController.logout);
router.post('/auth/refresh', loginRateLimiter, platformAuthController.refresh);

// Geschützte Plattform-APIs
router.use(authenticatePlatform, loadPlatformUser);

router.get('/auth/me', platformAuthController.me);

router.get(
  '/dashboard',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_MANAGE, PLATFORM_PERMISSIONS.ALL),
  platformController.dashboard
);

router.get(
  '/monitoring',
  requirePlatformPermission(PLATFORM_PERMISSIONS.MONITORING_VIEW, PLATFORM_PERMISSIONS.ALL),
  platformController.monitoring
);

router.get(
  '/health',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_MANAGE, PLATFORM_PERMISSIONS.ALL),
  platformController.health
);

router.get(
  '/backups',
  requirePlatformPermission(PLATFORM_PERMISSIONS.BACKUPS_VIEW, PLATFORM_PERMISSIONS.ALL),
  platformController.backups
);

// Mandanten
router.get(
  '/tenants',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_VIEW, PLATFORM_PERMISSIONS.TENANT_MANAGE),
  platformController.listTenants
);
router.get(
  '/tenants/:id',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_VIEW, PLATFORM_PERMISSIONS.TENANT_MANAGE),
  platformController.getTenant
);
router.post(
  '/tenants',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_CREATE, PLATFORM_PERMISSIONS.TENANT_MANAGE),
  platformController.createTenant
);
router.put(
  '/tenants/:id',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_UPDATE, PLATFORM_PERMISSIONS.TENANT_MANAGE),
  platformController.updateTenant
);
router.post(
  '/tenants/:id/activate',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_UPDATE, PLATFORM_PERMISSIONS.TENANT_MANAGE),
  platformController.activateTenant
);
router.post(
  '/tenants/:id/suspend',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_UPDATE, PLATFORM_PERMISSIONS.TENANT_MANAGE),
  platformController.suspendTenant
);
router.post(
  '/tenants/:id/archive',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_UPDATE, PLATFORM_PERMISSIONS.TENANT_MANAGE),
  platformController.archiveTenant
);
router.delete(
  '/tenants/:id',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_DELETE, PLATFORM_PERMISSIONS.TENANT_MANAGE),
  platformController.deleteTenant
);
router.get(
  '/tenants/:id/export',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_VIEW, PLATFORM_PERMISSIONS.TENANT_MANAGE),
  platformController.exportTenant
);
router.post(
  '/tenants/:id/impersonate',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_IMPERSONATE, PLATFORM_PERMISSIONS.TENANT_MANAGE),
  platformController.impersonate
);
router.post(
  '/impersonation/end',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_IMPERSONATE),
  platformController.endImpersonation
);

// Einstellungen
router.get(
  '/settings',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_PLATFORM, PLATFORM_PERMISSIONS.ALL),
  platformController.getSettings
);
router.put(
  '/settings',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_PLATFORM, PLATFORM_PERMISSIONS.ALL),
  platformController.updateSettings
);

// Logs
router.get(
  '/logs',
  requirePlatformPermission(PLATFORM_PERMISSIONS.LOGS_VIEW, PLATFORM_PERMISSIONS.ALL),
  platformController.listLogs
);

// Plattformbenutzer
router.get(
  '/users',
  requirePlatformPermission(PLATFORM_PERMISSIONS.USERS_MANAGE, PLATFORM_PERMISSIONS.ALL),
  platformController.listPlatformUsers
);
router.post(
  '/users',
  requirePlatformPermission(PLATFORM_PERMISSIONS.USERS_MANAGE, PLATFORM_PERMISSIONS.ALL),
  platformController.createPlatformUser
);

// Mandantenbewerbungen
router.get(
  '/applications',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_VIEW, PLATFORM_PERMISSIONS.TENANT_MANAGE),
  platformController.listApplications
);
router.get(
  '/applications/:id',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_VIEW, PLATFORM_PERMISSIONS.TENANT_MANAGE),
  validateParams(applicationIdParamSchema),
  platformController.getApplication
);
router.patch(
  '/applications/:id/status',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_UPDATE, PLATFORM_PERMISSIONS.TENANT_MANAGE),
  validateParams(applicationIdParamSchema),
  validateBody(updateTenantApplicationStatusSchema),
  platformController.updateApplicationStatus
);
router.post(
  '/applications/:id/approve',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_CREATE, PLATFORM_PERMISSIONS.TENANT_MANAGE),
  validateParams(applicationIdParamSchema),
  validateBody(approveTenantApplicationSchema),
  platformController.approveApplication
);
router.post(
  '/applications/:id/reject',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_UPDATE, PLATFORM_PERMISSIONS.TENANT_MANAGE),
  validateParams(applicationIdParamSchema),
  platformController.rejectApplication
);
router.post(
  '/applications/:id/archive',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_UPDATE, PLATFORM_PERMISSIONS.TENANT_MANAGE),
  validateParams(applicationIdParamSchema),
  platformController.archiveApplication
);

// Rechtliche Seiten (Plattform)
router.get(
  '/legal-pages',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_PLATFORM, PLATFORM_PERMISSIONS.ALL),
  platformController.listLegalPages
);
router.put(
  '/legal-pages/:pageType',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_PLATFORM, PLATFORM_PERMISSIONS.ALL),
  validateBody(updatePlatformLegalPageSchema),
  platformController.updateLegalPage
);

export default router;
