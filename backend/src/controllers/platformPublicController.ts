import type { Request, Response, NextFunction } from 'express';
import {
  platformContext,
  platformSettingsService,
  tenantApplicationService,
} from '../platform/bootstrap';
import { platformLegalService } from '../platform/PlatformLegalService';
import { platformDomainService } from '../platform/PlatformDomainService';

export const platformPublicController = {
  async getPlatform(_req: Request, res: Response, next: NextFunction) {
    try {
      const platform = platformContext.current();
      const settings = await platformSettingsService.getAllSettings();
      const domains = platformDomainService.getPublicView(platform);
      const readString = (key: string): string | null => {
        const v = settings[key];
        return typeof v === 'string' && v.trim() ? v.trim() : null;
      };

      res.json({
        name: platform.platformName,
        version: platform.platformVersion,
        baseDomain: platform.baseDomain,
        wwwDomain: domains.wwwDomain,
        apiDomain: domains.apiDomain,
        wildcardDomain: domains.wildcardDomain,
        tenantDomainPattern: domains.tenantDomainPattern,
        domains,
        maintenanceMode: platform.maintenanceMode,
        maintenanceMessage: platform.maintenanceMessage ?? null,
        primaryColor: readString('platform.branding.primaryColor') ?? '#1565c0',
        defaultLocale: platform.defaultLocale,
        registrationEnabled: platform.registrationEnabled,
        contactName: readString('platform.contact.name'),
        contactEmail: readString('platform.contact.email'),
        contactPhone: readString('platform.contact.phone'),
        contactAddress: readString('platform.contact.address'),
        website: readString('platform.contact.website'),
        footerText: readString('platform.branding.footerText'),
        githubUrl: readString('platform.links.github') ?? 'https://github.com/TimUx/FestManager',
      });
    } catch (error) {
      next(error);
    }
  },

  async listLegalLinks(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ items: await platformLegalService.listPublicLinks() });
    } catch (error) {
      next(error);
    }
  },

  async getLegalPage(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await platformLegalService.getPublicBySlug(req.params.slug as string));
    } catch (error) {
      next(error);
    }
  },

  async submitApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await tenantApplicationService.submit(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
};
