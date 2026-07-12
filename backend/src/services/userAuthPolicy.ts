import { RoleName } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { isValidUsername, normalizeEmail, normalizeUsername } from './loginIdentifier';

export interface UserAuthFlags {
  passwordEnabled: boolean;
  magicLinkEnabled: boolean;
}

export function defaultAuthFlagsForRole(role: RoleName, email?: string | null): UserAuthFlags {
  if (role === 'ADMIN') {
    return { passwordEnabled: false, magicLinkEnabled: true };
  }
  return {
    passwordEnabled: true,
    magicLinkEnabled: Boolean(email?.trim()),
  };
}

export function validateAdminIdentity(email?: string | null, username?: string | null): void {
  if (!email?.trim()) {
    throw new AppError(400, 'Administratoren benötigen eine E-Mail-Adresse');
  }
  if (username?.trim() && !isValidUsername(username.trim())) {
    throw new AppError(400, 'Benutzername: 3–32 Zeichen, Buchstabe zuerst, nur Buchstaben, Zahlen, _ und -');
  }
}

export function validateStaffIdentity(email?: string | null, username?: string | null): void {
  if (!username?.trim()) {
    throw new AppError(400, 'Mitarbeiter benötigen einen Benutzernamen');
  }
  if (!isValidUsername(username.trim())) {
    throw new AppError(400, 'Benutzername: 3–32 Zeichen, Buchstabe zuerst, nur Buchstaben, Zahlen, _ und -');
  }
}

export function validateAuthFlags(
  flags: UserAuthFlags,
  role: RoleName,
  email?: string | null,
  passwordHash?: string | null
): void {
  if (role === 'ADMIN' && !email?.trim()) {
    throw new AppError(400, 'Administratoren benötigen eine E-Mail-Adresse');
  }
  if (flags.magicLinkEnabled && !email?.trim()) {
    throw new AppError(400, 'Magic-Link-Anmeldung erfordert eine E-Mail-Adresse');
  }
  if (flags.passwordEnabled && !passwordHash) {
    throw new AppError(400, 'Passwort-Anmeldung erfordert ein Passwort');
  }
  if (!flags.passwordEnabled && !flags.magicLinkEnabled) {
    throw new AppError(400, 'Mindestens eine Anmeldemethode muss aktiv sein');
  }
}

export function normalizeUserEmail(email?: string | null): string | null {
  const trimmed = email?.trim();
  return trimmed ? normalizeEmail(trimmed) : null;
}

export function normalizeUserUsername(username?: string | null): string | null {
  const trimmed = username?.trim();
  return trimmed ? normalizeUsername(trimmed) : null;
}

export function staffPasswordMinLength(): number {
  return 4;
}

export function adminPasswordMinLength(): number {
  return 8;
}
