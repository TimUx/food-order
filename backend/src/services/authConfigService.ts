import { prisma } from '../config/database';

export type AuthMode =
  | 'passwordless_only'
  | 'password_only'
  | 'password_or_magic'
  | 'password_and_magic';

export interface AuthConfig {
  mode: AuthMode;
  magicLinkTtlMinutes: number;
  loginCodeTtlMinutes: number;
  loginCodeLength: number;
  passwordEnabled: boolean;
  magicLinkEnabled: boolean;
  loginCodeEnabled: boolean;
}

const DEFAULT_MODE: AuthMode = 'password_or_magic';

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isAuthMode(value: string): value is AuthMode {
  return ['passwordless_only', 'password_only', 'password_or_magic', 'password_and_magic'].includes(value);
}

function deriveCapabilities(mode: AuthMode): Pick<AuthConfig, 'passwordEnabled' | 'magicLinkEnabled' | 'loginCodeEnabled'> {
  switch (mode) {
    case 'passwordless_only':
      return { passwordEnabled: false, magicLinkEnabled: true, loginCodeEnabled: true };
    case 'password_only':
      return { passwordEnabled: true, magicLinkEnabled: false, loginCodeEnabled: false };
    case 'password_or_magic':
      return { passwordEnabled: true, magicLinkEnabled: true, loginCodeEnabled: true };
    case 'password_and_magic':
      return { passwordEnabled: true, magicLinkEnabled: true, loginCodeEnabled: true };
    default:
      return { passwordEnabled: true, magicLinkEnabled: true, loginCodeEnabled: true };
  }
}

export const authConfigService = {
  async getConfig(): Promise<AuthConfig> {
    const rows = await prisma.platformSettings.findMany({
      where: { key: { startsWith: 'platform.auth.' } },
    });
    const map = new Map(rows.map((r: { key: string; value: unknown }) => [r.key, r.value]));
    const modeRaw = readString(map.get('platform.auth.mode'));
    const mode = isAuthMode(modeRaw) ? modeRaw : DEFAULT_MODE;
    const capabilities = deriveCapabilities(mode);

    return {
      mode,
      magicLinkTtlMinutes: readNumber(map.get('platform.auth.magicLinkTtlMinutes'), 15),
      loginCodeTtlMinutes: readNumber(map.get('platform.auth.loginCodeTtlMinutes'), 10),
      loginCodeLength: readNumber(map.get('platform.auth.loginCodeLength'), 6),
      ...capabilities,
    };
  },

  async updateConfig(updates: Partial<AuthConfig>, updatedBy?: string): Promise<AuthConfig> {
    const entries: Array<[string, unknown]> = [];
    if (updates.mode) entries.push(['platform.auth.mode', updates.mode]);
    if (updates.magicLinkTtlMinutes !== undefined) {
      entries.push(['platform.auth.magicLinkTtlMinutes', updates.magicLinkTtlMinutes]);
    }
    if (updates.loginCodeTtlMinutes !== undefined) {
      entries.push(['platform.auth.loginCodeTtlMinutes', updates.loginCodeTtlMinutes]);
    }
    if (updates.loginCodeLength !== undefined) {
      entries.push(['platform.auth.loginCodeLength', updates.loginCodeLength]);
    }

    for (const [key, value] of entries) {
      await prisma.platformSettings.upsert({
        where: { key },
        update: { value: value as object, updatedBy: updatedBy ?? null },
        create: { key, value: value as object, updatedBy: updatedBy ?? null },
      });
    }

    return this.getConfig();
  },

  async getPublicConfig(): Promise<Pick<AuthConfig, 'mode' | 'passwordEnabled' | 'magicLinkEnabled' | 'loginCodeEnabled'>> {
    const config = await this.getConfig();
    return {
      mode: config.mode,
      passwordEnabled: config.passwordEnabled,
      magicLinkEnabled: config.magicLinkEnabled,
      loginCodeEnabled: config.loginCodeEnabled,
    };
  },
};
