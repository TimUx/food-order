import { orderRepository } from '../../repositories';
import { formatOrderNumber, formatEventDate, getCancellationDeadline, formatDateTimeDE, resolveCancellationDeadlineHours } from '../../utils/helpers';
import { emitOrderCreated } from '../../socket';
import { clubService } from '../../services/clubService';
import { hookSystem } from '../../platform/bootstrap';
import { CORE_HOOKS } from '../../platform/types';
import type { PayableResourceAdapter, PayableResource } from '../../platform/module-api';

export const ORDER_PAYABLE_TYPE = 'order';

export const orderPayableAdapter: PayableResourceAdapter = {
  type: ORDER_PAYABLE_TYPE,

  async toPayableResource(id: string, baseUrl: string): Promise<PayableResource | null> {
    const order = await orderRepository.findById(id);
    if (!order) return null;

    const amountCents = Math.round(Number(order.totalPrice) * 100);
    return {
      type: ORDER_PAYABLE_TYPE,
      id: order.id,
      amountCents,
      currency: 'EUR',
      description: `Bestellung ${formatOrderNumber(order.orderNumber)}`,
      customerEmail: order.customer?.email ?? undefined,
      returnUrl: `${baseUrl}/status/${order.lookupToken}?payment=success`,
      cancelUrl: `${baseUrl}/status/${order.lookupToken}?payment=cancelled`,
      metadata: {
        orderNumber: String(order.orderNumber),
        eventId: order.eventId,
        source: order.source,
      },
    };
  },

  async onPaymentCompleted(id: string): Promise<void> {
    const order = await orderRepository.findById(id);
    if (!order) return;

    // Nach erfolgreicher Zahlung automatisch für die Küche freigeben.
    await orderRepository.setReleasedToKitchen(id, true);

    const mapped = {
      id: order.id,
      lookupToken: order.lookupToken,
      eventId: order.eventId,
      orderNumber: order.orderNumber,
      displayNumber: formatOrderNumber(order.orderNumber),
      orderDate: order.orderDate,
      eventDateLabel: formatEventDate(order.orderDate),
      source: order.source,
      sourceLabel: order.source,
      status: order.status,
      statusLabel: order.status,
      totalPrice: Number(order.totalPrice),
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        id: i.id,
        foodItemId: i.foodItemId,
        name: i.foodItem.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
      customer: order.customer
        ? {
            firstName: order.customer.firstName,
            lastName: order.customer.lastName,
            email: order.customer.email,
            phone: order.customer.phone,
          }
        : null,
    };

    let cancellationDeadlineLabel: string | undefined;
    if (order.event) {
      const settings = await clubService.getOrderSettings();
      const deadlineHours = resolveCancellationDeadlineHours(
        settings.cancellationDeadlineHours,
        settings.cancellationDeadlineUnit
      );
      const deadline = getCancellationDeadline(
        order.event.date,
        order.event.startTime,
        deadlineHours
      );
      cancellationDeadlineLabel = formatDateTimeDE(deadline);
    }

    const hookPayload = {
      ...mapped,
      cancellationDeadlineLabel,
    };

    emitOrderCreated(order.eventId, hookPayload);
    hookSystem.emitAsync(CORE_HOOKS.ORDER_CREATED, hookPayload);
    hookSystem.emitAsync(CORE_HOOKS.ORDER_PAID, { orderId: id, ...hookPayload });
  },

  async onPaymentFailed(_id: string): Promise<void> {
    // Bestellung bleibt in DB, wird nicht an Küche übergeben
  },

  async onPaymentCancelled(_id: string): Promise<void> {
    // Bestellung bleibt in DB, Zahlung abgebrochen
  },
};
