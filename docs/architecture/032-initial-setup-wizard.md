# ADR 032: Initial Setup Wizard

## Status

Accepted (v2.1.0)

## Kontext

Neue Mandanten benötigen eine geführte Ersteinrichtung (Organisation, Kontakt, Rechtliches, Admin, optionale Veranstaltung).

## Entscheidung

- Mandantenbezogener Setup-Status in `TenantSettings.extraJson.initialSetup`
- 7-stufiger Assistent (`/admin/einrichtung`) mit automatischer Weiterleitung bei erstem Admin-Login
- Backend-API: `GET/POST /api/setup/*` (nur ADMIN)
- Nach Abschluss: Assistent erscheint nicht erneut; Neustart über `POST /api/setup/reset`
- Bestehende Mandanten werden bei Migration als `completed: true` markiert

## Schritte

1. Willkommen
2. Organisation (Name, Typ, Logo, Beschreibung)
3. Kontakt (Adresse, PLZ, Ort, Land, Telefon, E-Mail, Webseite, Social Media)
4. Rechtliches (optional)
5. Administrator prüfen
6. Erste Veranstaltung (optional, überspringbar)
7. Abschluss & Speichern

## Konsequenzen

- Verbesserte Onboarding-UX für ehrenamtliche Administratoren
- Setup-Daten werden in Tenant, ClubSettings und optional Event persistiert
- Willkommens-E-Mail über zentralen MailService
