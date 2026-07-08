import { orderRepository } from '../../repositories';
import { formatOrderNumber, formatEventDate } from '../../utils/helpers';
import { emitOrderCreated } from '../../socket';
import { emailService } from '../../services/emailService';
import { clubService } from '../../services/clubService';
import { getCancellationDeadline, formatDateTimeDE } from '../../utils/helpers';
import { featureHooks, CORE_HOOKS } from '../../module-system';
import type { PayableResourceAdapter, PayableResource } from '../../module-system/extension-points';

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
      returnUrl: `${baseUrl}/status/${order.id}?payment=success`,
      cancelUrl: `${baseUrl}/status/${order.id}?payment=cancelled`,
      metadata: {
        orderNumber: String(order.orderNumber),
        eventId: order.eventId,
      },
    };
  },

  async onPaymentCompleted(id: string): Promise<void> {
    const order = await orderRepository.findById(id);
    if (!order) return;

    const mapped = {
      id: order.id,
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

    emitOrderCreated(order.eventId, mapped);
    featureHooks.emitAsync(CORE_HOOKS.ORDER_CREATED, mapped);
    featureHooks.emitAsync(CORE_HOOKS.ORDER_PAID, { orderId: id, ...mapped });

    if (order.customer?.email && order.event) {
      const club = await clubService.getPublic();
      const settings = await clubService.getSettings();
      const deadline = getCancellationDeadline(
        order.event.date,
        order.event.startTime,
        settings.cancellationDeadlineHours
      );

      emailService
        .sendOrderConfirmation(
          order.customer.email,
          {
            id: mapped.id,
            displayNumber: mapped.displayNumber,
            totalPrice: mapped.totalPrice,
            eventDateLabel: mapped.eventDateLabel,
            items: mapped.items.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              lineTotal: i.lineTotal,
            })),
            cancellationDeadlineLabel: formatDateTimeDE(deadline),
          },
          {
            clubName: club.clubName,
            contactName: club.contactName,
            email: club.email,
            phone: club.phone,
            address: club.address,
          }
        )
        .catch(() => {});
    }
  },

  async onPaymentFailed(_id: string): Promise<void> {
    // Bestellung bleibt in DB, wird nicht an Küche übergeben
  },
};
