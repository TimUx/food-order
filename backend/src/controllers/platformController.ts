import type { Response, NextFunction } from 'express';
import type { PlatformAuthRequest } from '../middleware/platformAuth';
import { platformAuthService } from '../services/platformAuthService';
import {
  platformDashboardService,
  platformTenantAdminService,
  impersonationService,
  platformSettingsService,
  auditService,
  healthService,
  tenantService,
  tenantApplicationService,
  reloadPlatformContextFromSettings,
  platformBackupService,
} from '../platform/bootstrap';
import { platformLegalService } from '../platform/PlatformLegalService';
import { platformUserAdminService } from '../platform/PlatformUserAdminService';
import { platformContext } from '../platform/bootstrap';
import { platformDomainService } from '../platform/PlatformDomainService';
import { AppError } from '../middleware/errorHandler';

export const platformAuthController = {
  async login(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as { identifier?: string; email?: string; password: string };
      const identifier = body.identifier ?? body.email ?? '';
      const result = await platformAuthService.login(identifier, body.password, req.headers['user-agent']);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async requestMagicLink(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { email } = req.body as { email: string };
      const result = await platformAuthService.requestMagicLink(
        email,
        req.headers['user-agent'],
        req.ip
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async verifyMagicLink(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { token } = req.body as { token: string };
      const result = await platformAuthService.verifyMagicLink(token, req.headers['user-agent']);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async requestPasswordReset(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { identifier } = req.body as { identifier: string };
      const result = await platformAuthService.requestPasswordReset(
        identifier,
        req.ip,
        req.headers['user-agent']
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body as { token: string; newPassword: string };
      const result = await platformAuthService.resetPassword(token, newPassword);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async logout(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body as { refreshToken?: string };
      if (refreshToken) {
        await platformAuthService.logout(refreshToken, req.platformUser?.userId);
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body as { refreshToken: string };
      const result = await platformAuthService.refresh(refreshToken);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async me(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.platformUser) throw new AppError(401, 'Nicht authentifiziert');
      const user = await platformAuthService.me(req.platformUser.userId);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.platformUser) throw new AppError(401, 'Nicht authentifiziert');
      res.json(await platformUserAdminService.updateProfile(req.platformUser.userId, req.body));
    } catch (err) {
      next(err);
    }
  },
};

export const platformController = {
  async dashboard(_req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(await platformDashboardService.getStats());
    } catch (err) {
      next(err);
    }
  },

  async health(_req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const defaultTenantExists = await tenantService.exists({ slug: 'default' });
      const tenantHealth = await healthService.checkTenantInfrastructure(defaultTenantExists);
      res.json({
        status: tenantHealth.tenantContextReady ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        infrastructure: tenantHealth,
      });
    } catch (err) {
      next(err);
    }
  },

  async listTenants(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { search, status, page, limit } = req.query;
      const result = await platformTenantAdminService.list({
        search: search as string | undefined,
        status: status as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getTenant(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await platformTenantAdminService.getDetail(req.params.id as string);
      if (!tenant) {
        res.status(404).json({ error: 'Mandant nicht gefunden' });
        return;
      }
      res.json(tenant);
    } catch (err) {
      next(err);
    }
  },

  async createTenant(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await platformTenantAdminService.create(
        req.body,
        req.platformUser!.userId
      );
      res.status(201).json(tenant);
    } catch (err) {
      next(err);
    }
  },

  async updateTenant(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await platformTenantAdminService.update(
        req.params.id as string,
        req.body,
        req.platformUser!.userId
      );
      res.json(tenant);
    } catch (err) {
      next(err);
    }
  },

  async activateTenant(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(await platformTenantAdminService.activate(req.params.id as string, req.platformUser!.userId));
    } catch (err) {
      next(err);
    }
  },

  async suspendTenant(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(await platformTenantAdminService.suspend(req.params.id as string, req.platformUser!.userId));
    } catch (err) {
      next(err);
    }
  },

  async archiveTenant(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(await platformTenantAdminService.archive(req.params.id as string, req.platformUser!.userId));
    } catch (err) {
      next(err);
    }
  },

  async deleteTenant(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      await platformTenantAdminService.delete(req.params.id as string, req.platformUser!.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async exportTenant(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(await platformTenantAdminService.exportTenant(req.params.id as string));
    } catch (err) {
      next(err);
    }
  },

  async resendTenantAccessInfo(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await platformTenantAdminService.resendAccessInfo(
        req.params.id as string,
        req.platformUser!.userId
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getTenantModules(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const modules = await platformTenantAdminService.listModuleEntitlements(req.params.id as string);
      res.json({ modules });
    } catch (err) {
      next(err);
    }
  },

  async updateTenantModules(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { moduleIds } = req.body as { moduleIds: string[] };
      const modules = await platformTenantAdminService.updateModuleEntitlements(
        req.params.id as string,
        moduleIds,
        req.platformUser!.userId
      );
      res.json({ modules });
    } catch (err) {
      next(err);
    }
  },

  async impersonate(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await impersonationService.startImpersonation(
        req.platformUser!.userId,
        req.platformUser!.sessionId!,
        req.params.id as string
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async endImpersonation(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { platformSessionId } = req.body as { platformSessionId: string };
      const result = await impersonationService.endImpersonation(
        req.platformUser!.userId,
        platformSessionId
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getSettings(_req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(await platformSettingsService.getAllSettings());
    } catch (err) {
      next(err);
    }
  },

  async updateSettings(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const settings = await platformSettingsService.updateSettings(
        req.body,
        req.platformUser?.userId
      );
      await reloadPlatformContextFromSettings();
      res.json(settings);
    } catch (err) {
      next(err);
    }
  },

  async listLogs(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const tenantId = req.query.tenantId as string | undefined;
      const logs = await auditService.getRecent(limit, undefined, tenantId);
      res.json({ items: logs });
    } catch (err) {
      next(err);
    }
  },

  async listPlatformUsers(_req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ items: await platformUserAdminService.listUsers() });
    } catch (err) {
      next(err);
    }
  },

  async createPlatformUser(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await platformUserAdminService.createUser(req.body, req.platformUser!.userId);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  },

  async updatePlatformUser(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(
        await platformUserAdminService.updateUser(
          req.params.id as string,
          req.body,
          req.platformUser!.userId
        )
      );
    } catch (err) {
      next(err);
    }
  },

  async backups(_req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(await platformBackupService.getOverview());
    } catch (err) {
      next(err);
    }
  },

  async createFullBackup(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await platformBackupService.createFullBackup(req.platformUser!.userId));
    } catch (err) {
      next(err);
    }
  },

  async createTenantBackup(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.body as { tenantId: string };
      res.status(201).json(
        await platformBackupService.createTenantBackup(tenantId, req.platformUser!.userId)
      );
    } catch (err) {
      next(err);
    }
  },

  async validateBackup(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(await platformBackupService.validateBackup(req.params.filename as string));
    } catch (err) {
      next(err);
    }
  },

  async restoreBackup(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(
        await platformBackupService.restoreBackup(req.params.filename as string, req.platformUser!.userId)
      );
    } catch (err) {
      next(err);
    }
  },

  async downloadBackup(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const filePath = platformBackupService.resolveDownloadPath(req.params.filename as string);
      res.download(filePath, req.params.filename as string);
    } catch (err) {
      next(err);
    }
  },

  async deleteBackup(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      await platformBackupService.deleteBackup(req.params.filename as string, req.platformUser!.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async listApplications(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, search, page, limit } = req.query;
      res.json(
        await tenantApplicationService.list({
          status: status as 'NEW' | 'UNDER_REVIEW' | 'CLARIFICATION' | 'APPROVED' | 'REJECTED' | 'ARCHIVED' | undefined,
          search: search as string | undefined,
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  async getApplication(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const application = await tenantApplicationService.getById(req.params.id as string);
      if (!application) {
        res.status(404).json({ error: 'Bewerbung nicht gefunden' });
        return;
      }
      res.json(application);
    } catch (err) {
      next(err);
    }
  },

  async updateApplicationStatus(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, adminComment } = req.body as {
        status: 'NEW' | 'UNDER_REVIEW' | 'CLARIFICATION' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
        adminComment?: string;
      };
      res.json(
        await tenantApplicationService.updateStatus(
          req.params.id as string,
          status,
          req.platformUser!.userId,
          adminComment
        )
      );
    } catch (err) {
      next(err);
    }
  },

  async approveApplication(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { createTenant, adminComment } = req.body as {
        createTenant?: boolean;
        adminComment?: string;
      };
      res.json(
        await tenantApplicationService.approveAndCreateTenant(
          req.params.id as string,
          req.platformUser!.userId,
          { createTenant, adminComment }
        )
      );
    } catch (err) {
      next(err);
    }
  },

  async rejectApplication(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { adminComment } = req.body as { adminComment?: string };
      res.json(
        await tenantApplicationService.reject(
          req.params.id as string,
          req.platformUser!.userId,
          adminComment
        )
      );
    } catch (err) {
      next(err);
    }
  },

  async archiveApplication(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(
        await tenantApplicationService.archive(req.params.id as string, req.platformUser!.userId)
      );
    } catch (err) {
      next(err);
    }
  },

  async deleteApplication(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      await tenantApplicationService.delete(req.params.id as string, req.platformUser!.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async setApplicationTenantLink(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.body as { tenantId: string | null };
      res.json(
        await tenantApplicationService.setTenantLink(
          req.params.id as string,
          tenantId,
          req.platformUser!.userId
        )
      );
    } catch (err) {
      next(err);
    }
  },

  async listLegalPages(_req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ items: await platformLegalService.listAdmin() });
    } catch (err) {
      next(err);
    }
  },

  async getLegalPageExample(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({
        contentHtml: await platformLegalService.getExampleContent(req.params.pageType as string),
      });
    } catch (err) {
      next(err);
    }
  },

  async getDomains(_req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const platform = platformContext.current();
      const domains = platformDomainService.getPublicView(platform);
      res.json({
        ...domains,
        baseDomain: domains.platformDomain,
        allowedDomains: platform.allowedDomains,
        allowedOrigins: domains.allowedOrigins,
        note: 'Pfad-basiertes Mandanten-Routing: Mandanten sind unter https://<app-domain>/<slug>/ erreichbar. Werte werden über ENV/Docker gesetzt und sind hier schreibgeschützt.',
      });
    } catch (err) {
      next(err);
    }
  },

  async updateLegalPage(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(
        await platformLegalService.updatePage(req.params.pageType as string, req.body)
      );
    } catch (err) {
      next(err);
    }
  },
};
