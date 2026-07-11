export interface EventOrdersExport {
  event: {
    id: string;
    name: string;
    date: string;
    eventDateLabel: string;
    startTime: string;
    endTime: string;
  };
  exportedAt: string;
  orderCount: number;
  orders: Array<{
    eventName: string;
    eventDateLabel: string;
    eventTime: string;
    orderNumber: string;
    status: string;
    source: string;
    createdAt: string;
    orderDate: string;
    customerFirstName: string;
    customerLastName: string;
    customerEmail: string;
    customerPhone: string;
    itemsSummary: string;
    itemCount: number;
    totalPriceAmount: number;
    readyAt: string;
    pickedUpAt: string;
    cancelledAt: string;
    items: Array<{
      name: string;
      quantity: number;
      unitPriceAmount: number;
      lineTotalAmount: number;
    }>;
  }>;
}
