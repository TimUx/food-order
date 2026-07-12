import bcrypt from 'bcryptjs';
import { RoleName } from '@prisma/client';
import { userRepository } from '../repositories';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../config/database';
import { resolveUserPermissions } from '../core/permissions';
import { permissionService } from '../platform/bootstrap';
import type { TenantRoleTemplateId } from '../core/permissions';
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
  roleTemplate?: string | null;
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
    permissions: resolveUserPermissions(user),
    passwordEnabled: user.passwordEnabled,
    magicLinkEnabled: user.magicLinkEnabled,
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
    permissions?: string[];
    passwordEnabled?: boolean;
    magicLinkEnabled?: boolean;
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

    const role = await prisma.role.findUnique({ where: { name: data.role } });
    if (!role) throw new AppError(500, 'Rolle nicht gefunden');

    let permissions: string[] = [];
    const roleTemplate: string | null = data.roleTemplate ?? null;
    if (data.role === 'STAFF') {
      if (data.roleTemplate) {
        permissions = permissionService.resolveTemplatePermissions(data.roleTemplate);
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
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      roleId: role.id,
      permissions,
      roleTemplate,
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

    if (nextRole === 'ADMIN') {
      validateAdminIdentity(nextEmail, nextUsername);
    } else {
      validateStaffIdentity(nextEmail, nextUsername);
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
    updateData.passwordHash = nextPasswordHash;
    if (data.role) {
      const role = await prisma.role.findUnique({ where: { name: data.role } });
      if (!role) throw new AppError(500, 'Rolle nicht gefunden');
      updateData.role = { connect: { id: role.id } };
    }

    const updated = await userRepository.update(id, updateData);
    return mapUser(updated);
  },

  async updatePermissions(
    id: string,
    data: { permissions: string[]; roleTemplate?: string | null }
  ) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError(404, 'Benutzer nicht gefunden');
    if (user.role.name !== 'STAFF') {
      throw new AppError(400, 'Berechtigungsvorlagen gelten nur für Mitarbeiter');
    }

    const permissions = permissionService.filterKnownPermissions(data.permissions);
    const updated = await userRepository.update(id, {
      permissions,
      roleTemplate: data.roleTemplate ?? null,
    });
    return mapUser(updated);
  },
};
