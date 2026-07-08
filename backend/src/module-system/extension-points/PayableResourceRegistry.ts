import type { PayableResource, PayableResourceAdapter } from './PayableResource';

class PayableResourceRegistryImpl {
  private adapters = new Map<string, PayableResourceAdapter>();

  register(adapter: PayableResourceAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  unregister(type: string): void {
    this.adapters.delete(type);
  }

  getAdapter(type: string): PayableResourceAdapter | undefined {
    return this.adapters.get(type);
  }

  async toPayableResource(type: string, id: string, baseUrl: string): Promise<PayableResource | null> {
    const adapter = this.adapters.get(type);
    if (!adapter) return null;
    return adapter.toPayableResource(id, baseUrl);
  }
}

export const payableResourceRegistry = new PayableResourceRegistryImpl();
