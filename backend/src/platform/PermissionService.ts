import { prisma } from '../config/database';
import type { AuditService } from './AuditService';
import type { ModulePermissionDefinition } from './types';
import type { ModuleRegistry } from './ModuleRegistry';
import { AppError } from '../middleware/errorHandler';
import { userRepository } from '../repositories';
import {
  CORE_PERMISSION_DEFINITIONS,
  TENANT_ROLE_TEMPLATES,
  type TenantRoleTemplateId,
  TENANT_ROLE_TEMPLATE_MAP,
} from '../core/permissions';
import { parsePermissionKeys } from './permissions';

export class PermissionService {
  constructor(
    private readonly moduleRegistry: ModuleRegistry,
    private readonly auditService: AuditService
  ) {}

  getAvailablePermissions(): ModulePermissionDefinition[] {
    const modulePerms = this.moduleRegistry.getPermissions();
    const keys = new Set(CORE_PERMISSION_DEFINITIONS.map((p) => p.key));
    const merged = [...CORE_PERMISSION_DEFINITIONS];
    for (const p of modulePerms) {
      if (!keys.has(p.key)) merged.push(p);
    }
    return merged;
  }

  getRoleTemplates() {
    return TENANT_ROLE_TEMPLATES;
  }

  resolveTemplatePermissions(templateId: TenantRoleTemplateId): string[] {
    const template = TENANT_ROLE_TEMPLATE_MAP[templateId];
    if (!template) {
      throw new AppError(400, `Unbekannte Rollenvorlage: ${templateId}`);
    }
    return this.filterKnownPermissions(template.permissions);
  }

  filterKnownPermissions(permissions: string[]): string[] {
    const allowed = new Set(this.getAvailablePermissions().map((p) => p.key));
    return Array.from(new Set(permissions)).filter((p) => allowed.has(p));
  }

  async getStaffPermissions(): Promise<string[]> {
    const staffRole = await prisma.role.findUnique({ where: { name: 'STAFF' } });
    return parsePermissionKeys(staffRole?.permissions);
  }

  async getPermissionCatalog(): Promise<{
    available: ModulePermissionDefinition[];
    staff: string[];
    templates: typeof TENANT_ROLE_TEMPLATES;
  }> {
    return {
      available: this.getAvailablePermissions(),
      staff: await this.getStaffPermissions(),
      templates: TENANT_ROLE_TEMPLATES,
    };
  }

  /** @deprecated Global STAFF permissions — use per-user permissions instead */
  async updateStaffPermissions(permissions: string[], actorId: string): Promise<string[]> {
    const desired = this.filterKnownPermissions(permissions);
    const unknown = permissions.filter((p) => p !== '' && !desired.includes(p));
    if (unknown.length > 0) {
      throw new AppError(400, `Unbekannte Berechtigung(en): ${unknown.join(', ')}`);
    }

    await prisma.role.update({
      where: { name: 'STAFF' },
      data: { permissions: desired },
    });

    await this.auditService.log({
      action: 'permissions.staff.updated',
      actorId,
      details: { permissions: desired, deprecated: true },
    });

    return desired;
  }

  async updateUserPermissions(
    userId: string,
    permissions: string[],
    actorId: string,
    roleTemplate?: string | null
  ): Promise<string[]> {
    const desired = this.filterKnownPermissions(permissions);

    try {
      await userRepository.update(userId, {
        permissions: desired,
        ...(roleTemplate !== undefined ? { roleTemplate } : {}),
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'Benutzer nicht gefunden') {
        throw new AppError(404, err.message);
      }
      throw err;
    }

    await this.auditService.log({
      action: 'permissions.user.updated',
      actorId,
      details: { userId, permissions: desired, roleTemplate },
    });

    return desired;
  }
}
