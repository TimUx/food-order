import type { Response, NextFunction } from 'express';
import type { PlatformAuthRequest } from '../middleware/platformAuth';
import { platformAuthService } from '../services/platformAuthService';
import {
  platformDashboardService,
  platformTenantAdminService,
  platformMonitoringService,
  impersonationService,
  platformSettingsService,
  auditService,
  healthService,
  tenantService,
} from '../platform/bootstrap';
import { platformUserRepository } from '../repositories/platformUserRepository';
import { AppError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import { ALL_PLATFORM_PERMISSIONS } from '../platform/platformPermissions';

export const platformAuthController = {
  async login(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const result = await platformAuthService.login(email, password, req.headers['user-agent']);
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
};

export const platformController = {
  async dashboard(_req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(await platformDashboardService.getStats());
    } catch (err) {
      next(err);
    }
  },

  async monitoring(_req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(await platformMonitoringService.getOverview());
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
      const users = await platformUserRepository.findAll();
      res.json({
        items: users.map((u: { id: string; email: string; firstName: string; lastName: string; active: boolean; mfaEnabled: boolean; lastLoginAt: Date | null; createdAt: Date }) => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          active: u.active,
          mfaEnabled: u.mfaEnabled,
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
          createdAt: u.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      next(err);
    }
  },

  async createPlatformUser(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName } = req.body as {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
      };
      const existing = await platformUserRepository.findByEmail(email);
      if (existing) throw new AppError(409, 'E-Mail bereits registriert');
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await platformUserRepository.create({
        email,
        passwordHash,
        firstName,
        lastName,
        permissions: ALL_PLATFORM_PERMISSIONS,
      });
      res.status(201).json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (err) {
      next(err);
    }
  },

  async backups(_req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({
        strategies: ['full', 'tenant'],
        lastFullBackup: null,
        restoreAvailable: false,
        note: 'Backup/Restore-Automatisierung in Phase 4+',
      });
    } catch (err) {
      next(err);
    }
  },
};
