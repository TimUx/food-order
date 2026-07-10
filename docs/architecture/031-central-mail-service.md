# ADR 031: Zentraler MailService

## Status

Accepted (v2.1.0)

## Kontext

Bisher besaßen Mandanten eigene SMTP-Konfigurationen (TenantModule, ClubSettings, Fallback auf Plattform-SMTP). Das erschwerte Betrieb, Sicherheit und Compliance in Multi-Tenant-Umgebungen.

## Entscheidung

- SMTP-Konfiguration wird **ausschließlich** in der Plattformverwaltung (`/platform/email`) gepflegt.
- Ein zentraler `MailService` (`backend/src/platform/mail/MailService.ts`) ist der einzige Einstiegspunkt für E-Mail-Versand.
- Mandanten können nur noch **Branding-Overrides** (Absendername, Reply-To) in den Benachrichtigungseinstellungen setzen.
- Alle Module (Bestellungen, Auth, Setup, Bewerbungen, Plattform-Benachrichtigungen) nutzen den MailService.

## Konsequenzen

### Vorteile

- Einheitliche SMTP-Verwaltung und Rotation von Credentials
- Einfacheres Monitoring (Mail-Queue über `notification_deliveries`)
- Keine mandantenspezifischen SMTP-Leaks

### Nachteile

- Mandanten können keinen eigenen Mailserver mehr nutzen
- Plattformadministrator muss SMTP vor Produktivbetrieb konfigurieren

## Migration

- Tenant-SMTP-Felder aus `module.notifications` entfernt
- `smtpResolver` nutzt nur noch Plattform-SMTP
- Bestehende `platform.smtp.*` Einstellungen bleiben erhalten
