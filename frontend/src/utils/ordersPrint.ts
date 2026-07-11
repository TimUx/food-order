import type { EventOrdersExport } from '@/types/ordersExport';
import { formatPrice } from '@/services/api';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPrintedAt(iso: string): string {
  return new Date(iso).toLocaleString('de-DE');
}

export function printOrdersExport(data: EventOrdersExport, clubName: string): void {
  const totalRevenue = data.orders.reduce((sum, order) => sum + order.totalPriceAmount, 0);

  const rows = data.orders.flatMap((order) => {
    if (order.items.length === 0) {
      return [{
        orderNumber: order.orderNumber,
        status: order.status,
        source: order.source,
        createdAt: order.createdAt,
        customer: `${order.customerFirstName} ${order.customerLastName}`.trim(),
        contact: [order.customerEmail, order.customerPhone].filter(Boolean).join(' · '),
        itemName: '—',
        quantity: '',
        lineTotal: '',
        totalPrice: formatPrice(order.totalPriceAmount),
        readyAt: order.readyAt,
        pickedUpAt: order.pickedUpAt,
        cancelledAt: order.cancelledAt,
      }];
    }

    return order.items.map((item, index) => ({
      orderNumber: order.orderNumber,
      status: order.status,
      source: order.source,
      createdAt: order.createdAt,
      customer: `${order.customerFirstName} ${order.customerLastName}`.trim(),
      contact: [order.customerEmail, order.customerPhone].filter(Boolean).join(' · '),
      itemName: item.name,
      quantity: String(item.quantity),
      lineTotal: `${formatPrice(item.lineTotalAmount)}`,
      totalPrice: index === 0 ? formatPrice(order.totalPriceAmount) : '',
      readyAt: index === 0 ? order.readyAt : '',
      pickedUpAt: index === 0 ? order.pickedUpAt : '',
      cancelledAt: index === 0 ? order.cancelledAt : '',
    }));
  });

  const tableRows = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.orderNumber)}</td>
      <td>${escapeHtml(row.status)}</td>
      <td>${escapeHtml(row.source)}</td>
      <td>${escapeHtml(row.createdAt)}</td>
      <td>${escapeHtml(row.customer)}</td>
      <td>${escapeHtml(row.contact)}</td>
      <td>${escapeHtml(row.itemName)}</td>
      <td>${escapeHtml(row.quantity)}</td>
      <td>${escapeHtml(row.lineTotal)}</td>
      <td>${escapeHtml(row.totalPrice)}</td>
      <td>${escapeHtml(row.readyAt)}</td>
      <td>${escapeHtml(row.pickedUpAt)}</td>
      <td>${escapeHtml(row.cancelledAt)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Bestellungen – ${escapeHtml(data.event.name)}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 24px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { margin-bottom: 16px; color: #444; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f3f3f3; }
    .summary { margin-top: 16px; font-weight: 700; }
    @media print {
      body { margin: 12mm; }
    }
  </style>
</head>
<body>
  <h1>Bestellübersicht</h1>
  <div class="meta">
    <div><strong>${escapeHtml(clubName)}</strong></div>
    <div>Veranstaltung: ${escapeHtml(data.event.name)}</div>
    <div>Datum: ${escapeHtml(data.event.eventDateLabel)} (${escapeHtml(data.event.startTime)}–${escapeHtml(data.event.endTime)})</div>
    <div>Exportiert am: ${escapeHtml(formatPrintedAt(data.exportedAt))}</div>
    <div>Anzahl Bestellungen: ${data.orderCount}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Nr.</th>
        <th>Status</th>
        <th>Quelle</th>
        <th>Bestellt am</th>
        <th>Kunde</th>
        <th>Kontakt</th>
        <th>Gericht</th>
        <th>Menge</th>
        <th>Zeilensumme</th>
        <th>Gesamt</th>
        <th>Fertig</th>
        <th>Abgeholt</th>
        <th>Storniert</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || '<tr><td colspan="13">Keine Bestellungen vorhanden</td></tr>'}
    </tbody>
  </table>
  <div class="summary">Gesamtumsatz: ${escapeHtml(formatPrice(totalRevenue))}</div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    throw new Error('Druckfenster konnte nicht geöffnet werden');
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
