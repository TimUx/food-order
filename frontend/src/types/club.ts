export interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpFrom: string;
  smtpPassConfigured: boolean;
  smtpEnabled: boolean;
  emailCustomText: string;
}

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpFrom: '',
  smtpPassConfigured: false,
  smtpEnabled: false,
  emailCustomText: '',
};

export interface ClubSettings {
  clubName: string;
  description?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  logoUrl?: string | null;
  orderFieldFirstNameRequired?: boolean;
  orderFieldLastNameRequired?: boolean;
  orderFieldEmailRequired?: boolean;
  orderFieldPhoneRequired?: boolean;
  cancellationDeadlineHours?: number;
  cancellationDeadlineUnit?: 'hours' | 'days';
}

export interface OrderFieldConfig {
  firstNameRequired: boolean;
  lastNameRequired: boolean;
  emailRequired: boolean;
  phoneRequired: boolean;
}

export interface OrderSettings {
  fields: OrderFieldConfig;
  cancellationDeadlineHours: number;
  cancellationDeadlineUnit: 'hours' | 'days';
}

export const DEFAULT_ORDER_FIELD_CONFIG: OrderFieldConfig = {
  firstNameRequired: true,
  lastNameRequired: true,
  emailRequired: false,
  phoneRequired: false,
};

export const DEFAULT_ORDER_SETTINGS: OrderSettings = {
  fields: DEFAULT_ORDER_FIELD_CONFIG,
  cancellationDeadlineHours: 24,
  cancellationDeadlineUnit: 'hours',
};

export const DEFAULT_CLUB: ClubSettings = {
  clubName: 'FestSchmiede',
  description: 'Essensbestellungen für unsere Veranstaltungen',
  contactName: 'Verwaltung',
  email: 'kontakt@verein.local',
  phone: '+49 123 456789',
  address: 'Musterstraße 1, 12345 Musterstadt',
  website: 'https://www.verein.local',
};
