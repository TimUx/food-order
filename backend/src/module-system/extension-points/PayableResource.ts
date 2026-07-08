/**
 * Abstrakte zahlbare Ressource – Payment-Modul kennt keine Bestellungen.
 * Andere Domänen (Orders, Tickets, Spenden) registrieren Adapter.
 */
export interface PayableResource {
  type: string;
  id: string;
  amountCents: number;
  currency: string;
  description: string;
  customerEmail?: string;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface PayableResourceAdapter {
  readonly type: string;
  toPayableResource(id: string, baseUrl: string): Promise<PayableResource | null>;
  onPaymentCompleted(id: string): Promise<void>;
  onPaymentFailed(id: string): Promise<void>;
}

export interface PaymentCheckoutResult {
  checkoutUrl: string;
  sessionId: string;
  providerId: string;
}

export interface PaymentService {
  isAvailable(): Promise<boolean>;
  createCheckout(resource: PayableResource, providerId?: string): Promise<PaymentCheckoutResult>;
  isResourceReleased(type: string, id: string): Promise<boolean>;
  filterReleasedIds(type: string, ids: string[]): Promise<string[]>;
}
