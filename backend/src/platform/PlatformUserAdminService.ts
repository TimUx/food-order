import bcrypt from 'bcryptjs';
import { platformUserRepository } from '../repositories/platformUserRepository';
import { AppError } from '../middleware/errorHandler';
import { ALL_PLATFORM_PERMISSIONS, parsePlatformPermissions } from './platformPermissions';
import { auditService } from './bootstrap';
import {
  adminPasswordMinLength,
  normalizeUserEmail,
  normalizeUserUsername,
  validateAuthFlags,
} from '../services/userAuthPolicy';

export interface PlatformUserDto {
  id: string;
  username: string | null;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  mfaEnabled: boolean;
  permissions: string[];
  passwordEnabled: boolean;
  magicLinkEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

function toDto(user: {
  id: string;
  username: string | null;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  mfaEnabled: boolean;
  passwordEnabled: boolean;
  magicLinkEnabled: boolean;
  permissions: unknown;
  lastLoginAt: Date | null;
  createdAt: Date;
}): PlatformUserDto {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    active: user.active,
    mfaEnabled: user.mfaEnabled,
    permissions: parsePlatformPermissions(user.permissions),
    passwordEnabled: user.passwordEnabled,
    magicLinkEnabled: user.magicLinkEnabled,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export class PlatformUserAdminService {
  async listUsers(): Promise<PlatformUserDto[]> {
    const users = await platformUserRepository.findAll();
    return users.map(toDto);
  }

  async createUser(
    data: {
      email: string;
      username?: string;
      password?: string;
      firstName: string;
      lastName: string;
      passwordEnabled?: boolean;
      magicLinkEnabled?: boolean;
    },
    actorId: string
  ): Promise<PlatformUserDto> {
    const email = normalizeUserEmail(data.email)!;
    const username = normalizeUserUsername(data.username);
    const passwordEnabled = data.passwordEnabled ?? false;
    const magicLinkEnabled = data.magicLinkEnabled ?? true;

    const existing = await platformUserRepository.findByEmail(email);
    if (existing) throw new AppError(409, 'E-Mail bereits registriert');
    if (username) {
      const conflict = await platformUserRepository.findByUsername(username);
      if (conflict) throw new AppError(409, 'Benutzername bereits vergeben');
    }

    let passwordHash: string | null = null;
    if (passwordEnabled) {
      if (!data.password || data.password.length < adminPasswordMinLength()) {
        throw new AppError(400, `Passwort muss mindestens ${adminPasswordMinLength()} Zeichen haben`);
      }
      passwordHash = await bcrypt.hash(data.password, 12);
    }

    validateAuthFlags({ passwordEnabled, magicLinkEnabled }, 'ADMIN', email, passwordHash);

    const user = await platformUserRepository.create({
      email,
      username,
      passwordHash,
      passwordEnabled,
      magicLinkEnabled,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      permissions: ALL_PLATFORM_PERMISSIONS,
    });

    await auditService.log({
      action: 'platform.user.create',
      actorId,
      details: { userId: user.id, email: user.email },
    });

    return toDto(user);
  }

  async updateUser(
    id: string,
    data: {
      email?: string;
      username?: string | null;
      password?: string;
      firstName?: string;
      lastName?: string;
      active?: boolean;
      passwordEnabled?: boolean;
      magicLinkEnabled?: boolean;
    },
    actorId: string
  ): Promise<PlatformUserDto> {
    const user = await platformUserRepository.findById(id);
    if (!user) throw new AppError(404, 'Benutzer nicht gefunden');

    const nextEmail = data.email !== undefined ? normalizeUserEmail(data.email)! : user.email;
    const nextUsername = data.username !== undefined ? normalizeUserUsername(data.username) : user.username;
    const nextPasswordEnabled = data.passwordEnabled ?? user.passwordEnabled;
    const nextMagicLinkEnabled = data.magicLinkEnabled ?? user.magicLinkEnabled;

    if (nextEmail !== user.email) {
      const conflict = await platformUserRepository.findByEmail(nextEmail);
      if (conflict && conflict.id !== id) throw new AppError(409, 'E-Mail bereits registriert');
    }
    if (nextUsername && nextUsername !== user.username) {
      const conflict = await platformUserRepository.findByUsername(nextUsername);
      if (conflict && conflict.id !== id) throw new AppError(409, 'Benutzername bereits vergeben');
    }

    if (data.active === false) {
      await this.ensureNotLastActiveAdmin(id, actorId);
    }

    let nextPasswordHash = user.passwordHash;
    if (data.password) {
      if (data.password.length < adminPasswordMinLength()) {
        throw new AppError(400, `Passwort muss mindestens ${adminPasswordMinLength()} Zeichen haben`);
      }
      nextPasswordHash = await bcrypt.hash(data.password, 12);
    } else if (!nextPasswordEnabled) {
      nextPasswordHash = null;
    }

    validateAuthFlags(
      { passwordEnabled: nextPasswordEnabled, magicLinkEnabled: nextMagicLinkEnabled },
      'ADMIN',
      nextEmail,
      nextPasswordHash
    );

    const update: {
      email?: string;
      username?: string | null;
      passwordHash?: string | null;
      firstName?: string;
      lastName?: string;
      active?: boolean;
      passwordEnabled?: boolean;
      magicLinkEnabled?: boolean;
    } = {
      passwordEnabled: nextPasswordEnabled,
      magicLinkEnabled: nextMagicLinkEnabled,
      passwordHash: nextPasswordHash,
    };

    if (data.firstName !== undefined) update.firstName = data.firstName.trim();
    if (data.lastName !== undefined) update.lastName = data.lastName.trim();
    if (data.email !== undefined) update.email = nextEmail;
    if (data.username !== undefined) update.username = nextUsername;
    if (data.active !== undefined) update.active = data.active;

    const updated = await platformUserRepository.update(id, update);

    await auditService.log({
      action: 'platform.user.update',
      actorId,
      details: { userId: id, fields: Object.keys(update) },
    });

    return toDto(updated);
  }

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      username?: string | null;
      passwordEnabled?: boolean;
      magicLinkEnabled?: boolean;
      currentPassword?: string;
      newPassword?: string;
    }
  ): Promise<PlatformUserDto> {
    const user = await platformUserRepository.findById(userId);
    if (!user || !user.active) throw new AppError(404, 'Benutzer nicht gefunden');

    const nextEmail = data.email !== undefined ? normalizeUserEmail(data.email)! : user.email;
    const nextUsername = data.username !== undefined ? normalizeUserUsername(data.username) : user.username;
    const nextPasswordEnabled = data.passwordEnabled ?? user.passwordEnabled;
    const nextMagicLinkEnabled = data.magicLinkEnabled ?? user.magicLinkEnabled;

    const emailChanging = nextEmail !== user.email;
    const passwordChanging = Boolean(data.newPassword);

    if ((emailChanging || passwordChanging) && user.passwordHash) {
      if (!data.currentPassword) {
        throw new AppError(400, 'Aktuelles Passwort erforderlich');
      }
      const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!valid) throw new AppError(401, 'Aktuelles Passwort ist falsch');
    }

    if (emailChanging) {
      const conflict = await platformUserRepository.findByEmail(nextEmail);
      if (conflict && conflict.id !== userId) throw new AppError(409, 'E-Mail bereits registriert');
    }
    if (nextUsername && nextUsername !== user.username) {
      const conflict = await platformUserRepository.findByUsername(nextUsername);
      if (conflict && conflict.id !== userId) throw new AppError(409, 'Benutzername bereits vergeben');
    }

    let nextPasswordHash = user.passwordHash;
    if (passwordChanging) {
      if (data.newPassword!.length < adminPasswordMinLength()) {
        throw new AppError(400, `Passwort muss mindestens ${adminPasswordMinLength()} Zeichen haben`);
      }
      nextPasswordHash = await bcrypt.hash(data.newPassword!, 12);
    } else if (!nextPasswordEnabled) {
      nextPasswordHash = null;
    }

    validateAuthFlags(
      { passwordEnabled: nextPasswordEnabled, magicLinkEnabled: nextMagicLinkEnabled },
      'ADMIN',
      nextEmail,
      nextPasswordHash
    );

    const updated = await platformUserRepository.update(userId, {
      firstName: data.firstName?.trim() ?? user.firstName,
      lastName: data.lastName?.trim() ?? user.lastName,
      email: nextEmail,
      username: nextUsername,
      passwordEnabled: nextPasswordEnabled,
      magicLinkEnabled: nextMagicLinkEnabled,
      passwordHash: nextPasswordHash,
    });

    await auditService.log({
      action: 'platform.user.profile.update',
      actorId: userId,
      details: { fields: ['profile'] },
    });

    return toDto(updated);
  }

  private async ensureNotLastActiveAdmin(targetId: string, actorId: string): Promise<void> {
    if (targetId === actorId) {
      throw new AppError(400, 'Eigenes Konto kann nicht deaktiviert werden');
    }
    const activeCount = await platformUserRepository.countActive();
    const target = await platformUserRepository.findById(targetId);
    if (target?.active && activeCount <= 1) {
      throw new AppError(400, 'Der letzte aktive Plattformadministrator kann nicht deaktiviert werden');
    }
  }
}

export const platformUserAdminService = new PlatformUserAdminService();
