import type { PayableResource, PaymentCheckoutResult, PaymentMethodInfo, PaymentService, PaymentStatusResult } from './PayableResource';

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

  async getAvailablePaymentMethods(): Promise<PaymentMethodInfo[]> {
    if (!this.service) return [];
    if (!(await this.service.isAvailable())) return [];
    return this.service.getAvailablePaymentMethods();
  }

  async createCheckout(resource: PayableResource, providerId?: string): Promise<PaymentCheckoutResult | null> {
    if (!this.service) return null;
    if (!(await this.service.isAvailable())) return null;
    return this.service.createCheckout(resource, providerId);
  }

  async getPaymentStatus(sessionId: string): Promise<PaymentStatusResult | null> {
    if (!this.service) return null;
    return this.service.getPaymentStatus(sessionId);
  }

  async retryCheckout(sessionId: string): Promise<PaymentCheckoutResult | null> {
    if (!this.service) return null;
    return this.service.retryCheckout(sessionId);
  }

  async cancelCheckout(sessionId: string): Promise<PaymentCheckoutResult> {
    if (!this.service) throw new Error('Payment service not available');
    return this.service.cancelCheckout(sessionId);
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
