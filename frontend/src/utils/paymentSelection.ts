import type { PaymentChoiceId, PaymentOption, PaymentSelectionState, PublicPaymentMethod } from '@/types/payment';

const CASH_OPTION: PaymentOption = {
  type: 'cash',
  id: 'cash',
  label: 'Bar vor Ort',
  description: 'Bezahlen Sie bei der Abholung an der Kasse',
};

const POS_CASH_OPTION: PaymentOption = {
  type: 'cash',
  id: 'cash',
  label: 'Bar vor Ort',
  description: 'Kunde bezahlt an der Kasse',
  recommended: true,
};

function onlineLabel(method: PublicPaymentMethod, hasMultipleWithSameName: boolean): string {
  if (hasMultipleWithSameName && method.description) {
    return `${method.displayName} (${method.description})`;
  }
  return method.displayName;
}

function toOnlineOption(method: PublicPaymentMethod, hasMultipleWithSameName: boolean): PaymentOption {
  return {
    type: 'online',
    id: method.methodId,
    label: onlineLabel(method, hasMultipleWithSameName),
    description: method.description,
    recommended: method.recommended,
    icon: method.icon,
  };
}

/**
 * Smart Payment Selection (Spec 6.2)
 * Entscheidet automatisch, ob und welche Zahlungsauswahl angezeigt wird.
 */
export function buildPaymentSelection(
  methods: PublicPaymentMethod[],
  allowCashOnSite: boolean
): PaymentSelectionState {
  if (methods.length === 0) {
    return {
      options: [CASH_OPTION],
      showSelection: false,
      defaultChoice: 'cash',
    };
  }

  const sameDisplayName = methods.filter((m) => m.displayName === methods[0]?.displayName).length > 1;
  const onlineOptions = methods
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => toOnlineOption(m, sameDisplayName));

  const recommendedOnline = onlineOptions.find((o) => o.recommended) ?? onlineOptions[0];

  // Fall 3: Nur Onlinezahlung, keine Barzahlung als Alternative
  if (methods.length === 1 && !allowCashOnSite) {
    return {
      options: onlineOptions,
      showSelection: false,
      defaultChoice: recommendedOnline.id,
    };
  }

  const options: PaymentOption[] = allowCashOnSite
    ? [CASH_OPTION, ...onlineOptions]
    : onlineOptions;

  // Fall 3 mit einer Online-Methode aber Bar erlaubt → Fall 4 (2 Optionen)
  const showSelection = options.length > 1;

  const defaultChoice: PaymentChoiceId = recommendedOnline?.recommended
    ? recommendedOnline.id
    : allowCashOnSite && !recommendedOnline
      ? 'cash'
      : recommendedOnline?.id ?? 'cash';

  return {
    options,
    showSelection,
    defaultChoice: showSelection ? defaultChoice : (options[0]?.id ?? 'cash'),
  };
}

/**
 * Smart Payment Selection für Kassenmodus (Spec 6.3).
 * Barzahlung ist standardmäßig vorausgewählt.
 */
export function buildPosPaymentSelection(
  methods: PublicPaymentMethod[],
  allowCashOnSite: boolean
): PaymentSelectionState {
  if (methods.length === 0) {
    return {
      options: [POS_CASH_OPTION],
      showSelection: false,
      defaultChoice: 'cash',
    };
  }

  const sameDisplayName = methods.filter((m) => m.displayName === methods[0]?.displayName).length > 1;
  const onlineOptions = methods
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => toOnlineOption(m, sameDisplayName));

  const recommendedOnline = onlineOptions.find((o) => o.recommended) ?? onlineOptions[0];

  if (!allowCashOnSite) {
    return {
      options: onlineOptions,
      showSelection: onlineOptions.length > 1,
      defaultChoice: recommendedOnline.id,
    };
  }

  const options: PaymentOption[] = [POS_CASH_OPTION, ...onlineOptions];
  const showSelection = options.length > 1;

  return {
    options,
    showSelection,
    defaultChoice: 'cash',
  };
}

export function formatSupportedMethods(methods: PublicPaymentMethod[]): string[] {
  const labels = new Set<string>();
  for (const m of methods) {
    for (const sm of m.supportedMethods) {
      switch (sm) {
        case 'card':
          labels.add('Kreditkarte');
          break;
        case 'apple_pay':
          labels.add('Apple Pay');
          break;
        case 'google_pay':
          labels.add('Google Pay');
          break;
        case 'paypal':
          labels.add('PayPal');
          break;
        case 'sepa':
          labels.add('SEPA');
          break;
        case 'giropay':
          labels.add('Online-Banking');
          break;
        default:
          break;
      }
    }
    if (m.description && methods.length === 1) {
      m.description.split(',').forEach((part) => labels.add(part.trim()));
    }
  }
  return Array.from(labels);
}

export function posPaymentStatusLabel(status: string): string {
  switch (status) {
    case 'PAYMENT_PENDING':
    case 'PAYMENT_PROCESSING':
    case 'CREATED':
      return 'Warte auf Zahlung…';
    default:
      return paymentStatusLabel(status);
  }
}

export function isOnlineChoice(choice: PaymentChoiceId): boolean {
  return choice !== 'cash';
}

export function getPaymentOptionLabel(options: PaymentOption[], choice: PaymentChoiceId): string {
  return options.find((o) => o.id === choice)?.label ?? 'Online bezahlen';
}

export function paymentStatusLabel(status: string): string {
  switch (status) {
    case 'PAYMENT_PENDING':
    case 'PAYMENT_PROCESSING':
    case 'CREATED':
      return 'Warte auf Zahlung …';
    case 'PAYMENT_PAID':
    case 'ORDER_CONFIRMED':
      return 'Zahlung erfolgreich';
    case 'PAYMENT_CANCELLED':
      return 'Zahlung abgebrochen';
    case 'PAYMENT_FAILED':
      return 'Zahlung fehlgeschlagen';
    case 'PAYMENT_TIMEOUT':
      return 'Zahlung abgelaufen';
    default:
      return 'Zahlungsstatus wird geprüft …';
  }
}

export function isPaymentSuccess(status: string): boolean {
  return status === 'PAYMENT_PAID' || status === 'ORDER_CONFIRMED' || status === 'IN_KITCHEN';
}

export function isPaymentFailure(status: string): boolean {
  return status === 'PAYMENT_FAILED' || status === 'PAYMENT_CANCELLED' || status === 'PAYMENT_TIMEOUT';
}
