import type { SettingsSchemaDefinition } from '../../platform/settings/types';
import {
  CORE_CLUB_NAMESPACE,
  CORE_EMAIL_NAMESPACE,
  CORE_ORDER_NAMESPACE,
} from '../../platform/settings/SettingsNamespaces';

export const clubSettingsSchema: SettingsSchemaDefinition = {
  namespace: CORE_CLUB_NAMESPACE,
  label: 'Veranstalter',
  description: 'Öffentliche Veranstalterdaten und Branding',
  adminPath: '/admin/verein',
  groups: [
    { id: 'general', label: 'Allgemein', description: 'Name und Beschreibung' },
    { id: 'contact', label: 'Kontakt', description: 'Kontaktdaten für die öffentliche Seite' },
    { id: 'branding', label: 'Branding', description: 'Logo und Website' },
  ],
  fields: [
    {
      key: 'clubName',
      group: 'general',
      label: 'Name des Veranstalters',
      type: 'string',
      required: true,
      default: 'FestSchmiede',
      helpText: 'Wird auf der Bestellseite und in E-Mails angezeigt',
    },
    {
      key: 'description',
      group: 'general',
      label: 'Beschreibung',
      type: 'text',
      helpText: 'Kurzbeschreibung des Veranstalters',
    },
    {
      key: 'contactName',
      group: 'contact',
      label: 'Ansprechpartner',
      type: 'string',
    },
    {
      key: 'email',
      group: 'contact',
      label: 'E-Mail',
      type: 'email',
    },
    {
      key: 'phone',
      group: 'contact',
      label: 'Telefon',
      type: 'string',
    },
    {
      key: 'address',
      group: 'contact',
      label: 'Adresse',
      type: 'text',
    },
    {
      key: 'website',
      group: 'branding',
      label: 'Website',
      type: 'url',
    },
    {
      key: 'logoUrl',
      group: 'branding',
      label: 'Logo-URL',
      type: 'url',
      helpText: 'Wird nach Upload automatisch gesetzt',
    },
  ],
};

export const orderSettingsSchema: SettingsSchemaDefinition = {
  namespace: CORE_ORDER_NAMESPACE,
  label: 'Bestellung',
  description: 'Pflichtfelder und Stornierungsfrist für Online-Bestellungen',
  adminPath: '/admin/bestellung',
  groups: [
    { id: 'fields', label: 'Pflichtfelder', description: 'Welche Kundendaten abgefragt werden' },
    { id: 'cancellation', label: 'Stornierung', description: 'Frist für Kundenstornierung' },
  ],
  fields: [
    {
      key: 'orderFieldFirstNameRequired',
      group: 'fields',
      label: 'Vorname Pflichtfeld',
      type: 'boolean',
      default: true,
    },
    {
      key: 'orderFieldLastNameRequired',
      group: 'fields',
      label: 'Nachname Pflichtfeld',
      type: 'boolean',
      default: true,
    },
    {
      key: 'orderFieldEmailRequired',
      group: 'fields',
      label: 'E-Mail Pflichtfeld',
      type: 'boolean',
      default: false,
    },
    {
      key: 'orderFieldPhoneRequired',
      group: 'fields',
      label: 'Telefon Pflichtfeld',
      type: 'boolean',
      default: false,
    },
    {
      key: 'cancellationDeadlineHours',
      group: 'cancellation',
      label: 'Stornierungsfrist',
      type: 'number',
      default: 24,
      validation: { min: 0 },
      helpText: '0 = Stornierung bis Veranstaltungsbeginn möglich',
    },
    {
      key: 'cancellationDeadlineUnit',
      group: 'cancellation',
      label: 'Einheit der Stornierungsfrist',
      type: 'select',
      default: 'hours',
      options: [
        { value: 'hours', label: 'Stunden vor Veranstaltung' },
        { value: 'days', label: 'Tage vor Veranstaltung' },
      ],
    },
  ],
};

/** @deprecated SMTP liegt im Notifications-Modul (`module.notifications`). */
export const emailSettingsSchema: SettingsSchemaDefinition = {
  namespace: CORE_EMAIL_NAMESPACE,
  label: 'E-Mail / SMTP',
  description: 'SMTP-Server für Bestellbestätigungen – vollständig in der Anwendung gespeichert',
  adminPath: '/admin/email',
  groups: [
    { id: 'smtp', label: 'SMTP-Server', description: 'Verbindung zum Mailserver' },
    { id: 'content', label: 'Inhalt', description: 'Zusätzlicher E-Mail-Text' },
  ],
  fields: [
    {
      key: 'smtpHost',
      group: 'smtp',
      label: 'SMTP-Host',
      type: 'string',
      helpText: 'z. B. smtp.example.com',
    },
    {
      key: 'smtpPort',
      group: 'smtp',
      label: 'SMTP-Port',
      type: 'number',
      default: 587,
      validation: { min: 1, max: 65535 },
    },
    {
      key: 'smtpUser',
      group: 'smtp',
      label: 'SMTP-Benutzer',
      type: 'string',
    },
    {
      key: 'smtpPass',
      group: 'smtp',
      label: 'SMTP-Passwort',
      type: 'password',
      encrypted: true,
      helpText: 'Leer lassen, um das gespeicherte Passwort beizubehalten',
    },
    {
      key: 'smtpFrom',
      group: 'smtp',
      label: 'Absender-Adresse',
      type: 'email',
      default: 'noreply@verein.local',
    },
    {
      key: 'emailCustomText',
      group: 'content',
      label: 'Zusätzlicher E-Mail-Text',
      type: 'text',
      helpText: 'Wird in Bestellbestätigungen eingefügt',
    },
  ],
};

export const CORE_SETTINGS_SCHEMAS = [
  clubSettingsSchema,
  orderSettingsSchema,
];
