import { extensionPointRegistry } from '../platform/bootstrap';
import { EXTENSION_POINT_NAMES } from '../platform/ExtensionPointRegistry';

export interface PayableResourceRegistryAccess {
  register(adapter: import('../platform/extension-points').PayableResourceAdapter): void;
  unregister(type: string): void;
  toPayableResource(type: string, id: string, baseUrl: string): Promise<import('../platform/extension-points').PayableResource | null>;
}

export interface PaymentServiceRegistryAccess {
  isAvailable(): Promise<boolean>;
  getAvailablePaymentMethods(): Promise<import('../platform/extension-points').PaymentMethodInfo[]>;
  createCheckout(
    resource: import('../platform/extension-points').PayableResource,
    providerId?: string
  ): Promise<import('../platform/extension-points').PaymentCheckoutResult | null>;
  getPaymentStatus(sessionId: string): Promise<import('../platform/extension-points').PaymentStatusResult | null>;
  retryCheckout(sessionId: string): Promise<import('../platform/extension-points').PaymentCheckoutResult | null>;
  cancelCheckout(sessionId: string): Promise<import('../platform/extension-points').PaymentCheckoutResult>;
  isResourceReleased(type: string, id: string): Promise<boolean>;
  filterReleasedIds(type: string, ids: string[]): Promise<string[]>;
}

export interface NotificationServiceRegistryAccess {
  isAvailable(): Promise<boolean>;
}

export interface LegalContentRegistryAccess {
  isAvailable(): boolean;
  listPublicLinks(): Promise<import('../platform/extension-points').PublicLegalLink[]>;
  getPublicPageBySlug(slug: string): Promise<import('../platform/extension-points').PublicLegalPage | null>;
}

/** Core greift Extension Points über die Registry zu – nicht über Modul-Implementierungen. */
export function getPayableResourceRegistry(): PayableResourceRegistryAccess {
  return extensionPointRegistry.getOrThrow<PayableResourceRegistryAccess>(
    EXTENSION_POINT_NAMES.PAYABLE_RESOURCE
  );
}

export function getPaymentServiceRegistry(): PaymentServiceRegistryAccess {
  return extensionPointRegistry.getOrThrow<PaymentServiceRegistryAccess>(
    EXTENSION_POINT_NAMES.PAYMENT_SERVICE
  );
}

export function getLegalContentRegistry(): LegalContentRegistryAccess {
  return extensionPointRegistry.getOrThrow<LegalContentRegistryAccess>(
    EXTENSION_POINT_NAMES.LEGAL_CONTENT
  );
}

export function getNotificationServiceRegistry(): NotificationServiceRegistryAccess {
  return extensionPointRegistry.getOrThrow<NotificationServiceRegistryAccess>(
    EXTENSION_POINT_NAMES.NOTIFICATION_SERVICE
  );
}

export interface PrinterServiceRegistryAccess {
  isAvailable(): Promise<boolean>;
  printKitchenTicket(payload: import('../platform/extension-points').OrderPrintPayload): Promise<void>;
  printReceipt(payload: import('../platform/extension-points').OrderPrintPayload): Promise<void>;
}

export function getPrinterServiceRegistry(): PrinterServiceRegistryAccess {
  return extensionPointRegistry.getOrThrow<PrinterServiceRegistryAccess>(
    EXTENSION_POINT_NAMES.PRINTER_SERVICE
  );
}
