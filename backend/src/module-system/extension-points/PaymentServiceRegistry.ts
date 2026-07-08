import type { PayableResource, PaymentCheckoutResult, PaymentService } from './PayableResource';

class PaymentServiceRegistryImpl {
  private service: PaymentService | null = null;

  register(service: PaymentService): void {
    this.service = service;
  }

  unregister(): void {
    this.service = null;
  }

  getService(): PaymentService | null {
    return this.service;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.service) return false;
    return this.service.isAvailable();
  }

  async createCheckout(resource: PayableResource, providerId?: string): Promise<PaymentCheckoutResult | null> {
    if (!this.service) return null;
    if (!(await this.service.isAvailable())) return null;
    return this.service.createCheckout(resource, providerId);
  }

  async isResourceReleased(type: string, id: string): Promise<boolean> {
    if (!this.service) return true;
    if (!(await this.service.isAvailable())) return true;
    return this.service.isResourceReleased(type, id);
  }

  async filterReleasedIds(type: string, ids: string[]): Promise<string[]> {
    if (!this.service) return ids;
    if (!(await this.service.isAvailable())) return ids;
    return this.service.filterReleasedIds(type, ids);
  }
}

export const paymentServiceRegistry = new PaymentServiceRegistryImpl();
