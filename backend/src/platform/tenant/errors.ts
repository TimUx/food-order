import { AppError } from '../../middleware/errorHandler';

export const TENANT_ERROR_CODES = {
  NOT_FOUND: 'TENANT_NOT_FOUND',
  INACTIVE: 'TENANT_INACTIVE',
  ARCHIVED: 'TENANT_ARCHIVED',
  INVALID_DOMAIN: 'TENANT_INVALID_DOMAIN',
  INVALID_HOST: 'TENANT_INVALID_HOST',
  CONTEXT_MISSING: 'TENANT_CONTEXT_MISSING',
  PLATFORM_CONFIG_MISSING: 'PLATFORM_CONFIG_MISSING',
} as const;

export class TenantNotFoundError extends AppError {
  constructor(message = 'Der angeforderte Veranstalter wurde nicht gefunden.') {
    super(404, message, TENANT_ERROR_CODES.NOT_FOUND);
    this.name = 'TenantNotFoundError';
  }
}

export class TenantInactiveError extends AppError {
  constructor(message = 'Dieser Veranstalter ist derzeit nicht aktiv.') {
    super(403, message, TENANT_ERROR_CODES.INACTIVE);
    this.name = 'TenantInactiveError';
  }
}

export class TenantArchivedError extends AppError {
  constructor(message = 'Dieser Veranstalter wurde archiviert.') {
    super(410, message, TENANT_ERROR_CODES.ARCHIVED);
    this.name = 'TenantArchivedError';
  }
}

export class TenantInvalidDomainError extends AppError {
  constructor(message = 'Die angeforderte Domain ist für diese Plattform nicht gültig.') {
    super(400, message, TENANT_ERROR_CODES.INVALID_DOMAIN);
    this.name = 'TenantInvalidDomainError';
  }
}

export class TenantInvalidHostError extends AppError {
  constructor(message = 'Der Host-Header der Anfrage ist ungültig.') {
    super(400, message, TENANT_ERROR_CODES.INVALID_HOST);
    this.name = 'TenantInvalidHostError';
  }
}

export class TenantContextRequiredError extends AppError {
  constructor(
    message = 'Mandanten-Kontext erforderlich. Bitte Subdomain oder Pfad-Präfix verwenden.'
  ) {
    super(400, message, 'TENANT_CONTEXT_REQUIRED');
    this.name = 'TenantContextRequiredError';
  }
}

export class TenantContextMissingError extends AppError {
  constructor(message = 'Kein Veranstalter-Kontext für diese Anfrage verfügbar.') {
    super(500, message, TENANT_ERROR_CODES.CONTEXT_MISSING);
    this.name = 'TenantContextMissingError';
  }
}

export class PlatformConfigMissingError extends AppError {
  constructor(message = 'Die Plattformkonfiguration ist unvollständig.') {
    super(503, message, TENANT_ERROR_CODES.PLATFORM_CONFIG_MISSING);
    this.name = 'PlatformConfigMissingError';
  }
}
