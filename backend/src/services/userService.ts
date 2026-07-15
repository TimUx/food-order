import bcrypt from 'bcryptjs';
import { RoleName } from '@prisma/client';
import { userRepository } from '../repositories';
import { AppError } from '../middleware/errorHandler';
import { ensureSystemRole } from '../core/roles/ensureSystemRoles';
import { resolveUserPermissions } from '../core/permissions';
import { permissionService } from '../platform/bootstrap';
import type { TenantRoleTemplateId } from '../core/permissions';
import { parseStoredRoleTemplates } from '../core/permissions';
import {
  adminPasswordMinLength,
  defaultAuthFlagsForRole,
  normalizeUserEmail,
  normalizeUserUsername,
  staffPasswordMinLength,
  validateAdminIdentity,
  validateAuthFlags,
  validateStaffIdentity,
} from './userAuthPolicy';

function mapUser(user: {
  id: string;
  username: string | null;
  email: string | null;
  firstName: string;
  lastName: string;
  active: boolean;
  passwordEnabled: boolean;
  magicLinkEnabled: boolean;
  notificationEmailsEnabled?: boolean;
  roleTemplate?: string | null;
  roleTemplates?: unknown;
  permissions?: unknown;
  role: { name: RoleName; permissions?: unknown };
  createdAt: Date;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    active: user.active,
    role: user.role.name,
    roleTemplate: user.roleTemplate ?? null,
    roleTemplates: parseStoredRoleTemplates(user),
    permissions: resolveUserPermissions(user),
    passwordEnabled: user.passwordEnabled,
    magicLinkEnabled: user.magicLinkEnabled,
    notificationEmailsEnabled: user.notificationEmailsEnabled ?? false,
    createdAt: user.createdAt.toISOString(),
  };
}

export const userService = {
  async list() {
    const users = await userRepository.findForTenant();
    return users.map(mapUser);
  },

  async create(data: {
    email?: string;
    username?: string;
    password?: string;
    firstName: string;
    lastName: string;
    role: RoleName;
    roleTemplate?: TenantRoleTemplateId | null;
    roleTemplates?: TenantRoleTemplateId[];
    permissions?: string[];
    passwordEnabled?: boolean;
    magicLinkEnabled?: boolean;
    notificationEmailsEnabled?: boolean;
  }) {
    const email = normalizeUserEmail(data.email);
    const username = normalizeUserUsername(data.username);

    if (data.role === 'ADMIN') {
      validateAdminIdentity(email, username);
    } else {
      validateStaffIdentity(email, username);
    }

    if (email) {
      const existing = await userRepository.findByEmail(email);
      if (existing) throw new AppError(409, 'E-Mail bereits registriert');
    }
    if (username) {
      const existing = await userRepository.findByUsername(username);
      if (existing) throw new AppError(409, 'Benutzername bereits vergeben');
    }

    const defaults = defaultAuthFlagsForRole(data.role, email);
    const passwordEnabled = data.passwordEnabled ?? defaults.passwordEnabled;
    const magicLinkEnabled = data.magicLinkEnabled ?? defaults.magicLinkEnabled;

    const minLength = data.role === 'STAFF' ? staffPasswordMinLength() : adminPasswordMinLength();
    if (passwordEnabled) {
      if (!data.password || data.password.length < minLength) {
        throw new AppError(400, `Passwort muss mindestens ${minLength} Zeichen haben`);
      }
    }

    const role = await ensureSystemRole(data.role);

    const templateIds = data.roleTemplates?.length
      ? data.roleTemplates
      : data.roleTemplate
        ? [data.roleTemplate]
        : [];

    let permissions: string[] = [];
    let roleTemplates: TenantRoleTemplateId[] = [];
    let roleTemplate: string | null = null;
    if (data.role === 'STAFF') {
      if (templateIds.length > 0) {
        permissions = permissionService.resolveTemplatesPermissions(templateIds);
        roleTemplates = templateIds;
        roleTemplate = templateIds[0] ?? null;
      } else if (data.permissions) {
        permissions = permissionService.filterKnownPermissions(data.permissions);
      }
    }

    const passwordHash = passwordEnabled && data.password
      ? await bcrypt.hash(data.password, 12)
      : null;

    validateAuthFlags({ passwordEnabled, magicLinkEnabled }, data.role, email, passwordHash);

    const user = await userRepository.create({
      email,
      username,
      passwordHash,
      passwordEnabled,
      magicLinkEnabled,
      notificationEmailsEnabled:
        data.role === 'ADMIN' ? Boolean(data.notificationEmailsEnabled) : false,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      roleId: role.id,
      permissions,
      roleTemplate,
      roleTemplates,
    });
    return mapUser(user);
  },

  async update(
    id: string,
    data: {
      email?: string | null;
      username?: string | null;
      password?: string;
      firstName?: string;
      lastName?: string;
      role?: RoleName;
      active?: boolean;
      passwordEnabled?: boolean;
      magicLinkEnabled?: boolean;
      notificationEmailsEnabled?: boolean;
    },
    currentUserId: string
  ) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError(404, 'Benutzer nicht gefunden');

    const nextRole = data.role ?? user.role.name;
    const nextEmail = data.email !== undefined ? normalizeUserEmail(data.email) : user.email;
    const nextUsername = data.username !== undefined ? normalizeUserUsername(data.username) : user.username;
    const nextPasswordEnabled = data.passwordEnabled ?? user.passwordEnabled;
    const nextMagicLinkEnabled = data.magicLinkEnabled ?? user.magicLinkEnabled;
    const nextNotificationEmailsEnabled =
      nextRole === 'ADMIN'
        ? (data.notificationEmailsEnabled ?? user.notificationEmailsEnabled)
        : false;

    if (nextRole === 'ADMIN') {
      validateAdminIdentity(nextEmail, nextUsername);
    } else {
      validateStaffIdentity(nextEmail, nextUsername);
    }

    if (nextNotificationEmailsEnabled && !nextEmail?.trim()) {
      throw new AppError(400, 'E-Mail-Benachrichtigungen erfordern eine E-Mail-Adresse');
    }

    if (nextEmail && nextEmail !== user.email) {
      const existing = await userRepository.findByEmail(nextEmail);
      if (existing && existing.id !== id) throw new AppError(409, 'E-Mail bereits registriert');
    }
    if (nextUsername && nextUsername !== user.username) {
      const existing = await userRepository.findByUsername(nextUsername);
      if (existing && existing.id !== id) throw new AppError(409, 'Benutzername bereits vergeben');
    }

    if (data.active === false && user.id === currentUserId) {
      throw new AppError(400, 'Sie können sich nicht selbst deaktivieren');
    }

    if (data.role && data.role !== 'ADMIN' && user.role.name === 'ADMIN') {
      const adminCount = await userRepository.countActiveAdmins();
      if (adminCount <= 1) {
        throw new AppError(400, 'Der letzte Administrator kann nicht herabgestuft werden');
      }
    }

    let nextPasswordHash = user.passwordHash;
    if (data.password) {
      const minLength = nextRole === 'STAFF' ? staffPasswordMinLength() : adminPasswordMinLength();
      if (data.password.length < minLength) {
        throw new AppError(400, `Passwort muss mindestens ${minLength} Zeichen haben`);
      }
      nextPasswordHash = await bcrypt.hash(data.password, 12);
    } else if (!nextPasswordEnabled) {
      nextPasswordHash = null;
    }

    validateAuthFlags(
      { passwordEnabled: nextPasswordEnabled, magicLinkEnabled: nextMagicLinkEnabled },
      nextRole,
      nextEmail,
      nextPasswordHash
    );

    const updateData: Parameters<typeof userRepository.update>[1] = {};
    if (data.email !== undefined) updateData.email = nextEmail;
    if (data.username !== undefined) updateData.username = nextUsername;
    if (data.firstName !== undefined) updateData.firstName = data.firstName.trim();
    if (data.lastName !== undefined) updateData.lastName = data.lastName.trim();
    if (data.active !== undefined) updateData.active = data.active;
    updateData.passwordEnabled = nextPasswordEnabled;
    updateData.magicLinkEnabled = nextMagicLinkEnabled;
    updateData.notificationEmailsEnabled = nextNotificationEmailsEnabled;
    updateData.passwordHash = nextPasswordHash;
    if (data.role && data.role !== user.role.name) {
      const role = await ensureSystemRole(data.role);
      updateData.role = { connect: { id: role.id } };
    }

    const updated = await userRepository.update(id, updateData);
    return mapUser(updated);
  },

  async updatePermissions(
    id: string,
    data: { permissions: string[]; roleTemplate?: string | null; roleTemplates?: TenantRoleTemplateId[] }
  ) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError(404, 'Benutzer nicht gefunden');
    if (user.role.name !== 'STAFF') {
      throw new AppError(400, 'Berechtigungsvorlagen gelten nur für Mitarbeiter');
    }

    const roleTemplates = data.roleTemplates?.length
      ? data.roleTemplates
      : data.roleTemplate
        ? [data.roleTemplate as TenantRoleTemplateId]
        : parseStoredRoleTemplates(user);
    const roleTemplate = roleTemplates[0] ?? data.roleTemplate ?? null;

    const permissions = roleTemplates.length
      ? permissionService.resolveTemplatesPermissions(roleTemplates)
      : permissionService.filterKnownPermissions(data.permissions);

    const updated = await userRepository.update(id, {
      permissions,
      roleTemplate,
      roleTemplates,
    });
    return mapUser(updated);
  },
};
