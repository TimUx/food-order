import { Router } from 'express';
import {
  authenticatePlatform,
  loadPlatformUser,
  requirePlatformPermission,
} from '../../middleware/platformAuth';
import { PLATFORM_PERMISSIONS } from '../../platform/platformPermissions';
import { platformAuthController, platformController } from '../../controllers/platformController';
import { platformMailController } from '../../controllers/platformMailController';
import { loginRateLimiter } from '../../middleware/rateLimit';
import { validateBody, validateParams } from '../../middleware/validation';
import {
  updateTenantApplicationStatusSchema,
  approveTenantApplicationSchema,
  updatePlatformLegalPageSchema,
  platformLegalPageTypeParamSchema,
  createPlatformTenantSchema,
  updatePlatformTenantSchema,
  applicationIdParamSchema,
  backupFilenameParamSchema,
  createTenantBackupSchema,
  restoreBackupSchema,
  createPlatformUserSchema,
  updatePlatformUserSchema,
  platformLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  magicLinkRequestSchema,
  verifyMagicLinkSchema,
  updatePlatformProfileSchema,
  idParamSchema,
  platformSmtpUpdateSchema,
  platformTestMailSchema,
  authModeUpdateSchema,
} from '../../validation/schemas';

const router = Router();

// Auth (öffentlich)
router.post('/auth/login', loginRateLimiter, validateBody(platformLoginSchema), platformAuthController.login);
router.post('/auth/magic-link', loginRateLimiter, validateBody(magicLinkRequestSchema), platformAuthController.requestMagicLink);
router.post('/auth/verify-magic-link', loginRateLimiter, validateBody(verifyMagicLinkSchema), platformAuthController.verifyMagicLink);
router.post('/auth/forgot-password', loginRateLimiter, validateBody(forgotPasswordSchema), platformAuthController.requestPasswordReset);
router.post('/auth/reset-password', loginRateLimiter, validateBody(resetPasswordSchema), platformAuthController.resetPassword);
router.post('/auth/logout', platformAuthController.logout);
router.post('/auth/refresh', loginRateLimiter, platformAuthController.refresh);

// Geschützte Plattform-APIs
router.use(authenticatePlatform, loadPlatformUser);

router.get('/auth/me', platformAuthController.me);
router.put(
  '/auth/profile',
  validateBody(updatePlatformProfileSchema),
  platformAuthController.updateProfile
);

router.get(
  '/dashboard',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_MANAGE, PLATFORM_PERMISSIONS.ALL),
  platformController.dashboard
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
router.post(
  '/backups/full',
  requirePlatformPermission(PLATFORM_PERMISSIONS.BACKUPS_MANAGE, PLATFORM_PERMISSIONS.SYSTEM_MANAGE, PLATFORM_PERMISSIONS.ALL),
  platformController.createFullBackup
);
router.post(
  '/backups/tenant',
  requirePlatformPermission(PLATFORM_PERMISSIONS.BACKUPS_MANAGE, PLATFORM_PERMISSIONS.SYSTEM_MANAGE, PLATFORM_PERMISSIONS.ALL),
  validateBody(createTenantBackupSchema),
  platformController.createTenantBackup
);
router.post(
  '/backups/:filename/validate',
  requirePlatformPermission(PLATFORM_PERMISSIONS.BACKUPS_VIEW, PLATFORM_PERMISSIONS.ALL),
  validateParams(backupFilenameParamSchema),
  platformController.validateBackup
);
router.post(
  '/backups/:filename/restore',
  requirePlatformPermission(PLATFORM_PERMISSIONS.BACKUPS_MANAGE, PLATFORM_PERMISSIONS.SYSTEM_MANAGE, PLATFORM_PERMISSIONS.ALL),
  validateParams(backupFilenameParamSchema),
  validateBody(restoreBackupSchema),
  platformController.restoreBackup
);
router.get(
  '/backups/:filename/download',
  requirePlatformPermission(PLATFORM_PERMISSIONS.BACKUPS_VIEW, PLATFORM_PERMISSIONS.ALL),
  validateParams(backupFilenameParamSchema),
  platformController.downloadBackup
);
router.delete(
  '/backups/:filename',
  requirePlatformPermission(PLATFORM_PERMISSIONS.BACKUPS_MANAGE, PLATFORM_PERMISSIONS.SYSTEM_MANAGE, PLATFORM_PERMISSIONS.ALL),
  validateParams(backupFilenameParamSchema),
  platformController.deleteBackup
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
  validateBody(createPlatformTenantSchema),
  platformController.createTenant
);
router.put(
  '/tenants/:id',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TENANT_UPDATE, PLATFORM_PERMISSIONS.TENANT_MANAGE),
  validateBody(updatePlatformTenantSchema),
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

// E-Mail (zentraler Maildienst)
router.get(
  '/mail',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_PLATFORM, PLATFORM_PERMISSIONS.ALL),
  platformMailController.getConfig
);
router.put(
  '/mail/smtp',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_PLATFORM, PLATFORM_PERMISSIONS.ALL),
  validateBody(platformSmtpUpdateSchema),
  platformMailController.updateSmtp
);
router.put(
  '/mail/auth',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_PLATFORM, PLATFORM_PERMISSIONS.ALL),
  validateBody(authModeUpdateSchema),
  platformMailController.updateAuth
);
router.post(
  '/mail/test-connection',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_PLATFORM, PLATFORM_PERMISSIONS.ALL),
  platformMailController.testConnection
);
router.post(
  '/mail/test',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_PLATFORM, PLATFORM_PERMISSIONS.ALL),
  validateBody(platformTestMailSchema),
  platformMailController.sendTestMail
);
router.get(
  '/mail/queue',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_PLATFORM, PLATFORM_PERMISSIONS.ALL),
  platformMailController.getQueueStatus
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
  validateBody(createPlatformUserSchema),
  platformController.createPlatformUser
);
router.put(
  '/users/:id',
  requirePlatformPermission(PLATFORM_PERMISSIONS.USERS_MANAGE, PLATFORM_PERMISSIONS.ALL),
  validateParams(idParamSchema),
  validateBody(updatePlatformUserSchema),
  platformController.updatePlatformUser
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
router.get(
  '/legal-pages/:pageType/example',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_PLATFORM, PLATFORM_PERMISSIONS.ALL),
  validateParams(platformLegalPageTypeParamSchema),
  platformController.getLegalPageExample
);
router.put(
  '/legal-pages/:pageType',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_PLATFORM, PLATFORM_PERMISSIONS.ALL),
  validateParams(platformLegalPageTypeParamSchema),
  validateBody(updatePlatformLegalPageSchema),
  platformController.updateLegalPage
);

// Domain-Konfiguration (Anzeige)
router.get(
  '/domains',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_PLATFORM, PLATFORM_PERMISSIONS.ALL),
  platformController.getDomains
);

export default router;
