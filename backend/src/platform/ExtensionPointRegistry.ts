import { Registry } from './Registry';

export const EXTENSION_POINT_NAMES = {
  PAYABLE_RESOURCE: 'payableResource',
  PAYMENT_SERVICE: 'paymentService',
  LEGAL_CONTENT: 'legalContent',
  NOTIFICATION_SERVICE: 'notificationService',
  PRINTER_SERVICE: 'printerService',
} as const;

export type ExtensionPointName = (typeof EXTENSION_POINT_NAMES)[keyof typeof EXTENSION_POINT_NAMES];

/**
 * Central registry for all extension points.
 * Core knows extension point names, not concrete module implementations.
 */
export class ExtensionPointRegistry {
  private readonly points = new Registry<unknown>();

  register<T>(name: string, registry: T): void {
    this.points.registerOrReplace(name, registry);
  }

  get<T>(name: string): T | undefined {
    return this.points.get(name) as T | undefined;
  }

  getOrThrow<T>(name: string): T {
    return this.points.getOrThrow(name) as T;
  }

  has(name: string): boolean {
    return this.points.has(name);
  }

  unregister(name: string): boolean {
    return this.points.unregister(name);
  }

  list(): string[] {
    return this.points.keys();
  }

  clear(): void {
    this.points.clear();
  }
}
