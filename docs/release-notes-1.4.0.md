# Release Notes — FestManager 1.4.0

**Veröffentlichungsdatum:** 2026-07-09

## Highlights

- Neues optionales Modul **Rechtliche Informationen** fuer Impressum, Datenschutz, AGB und Widerruf.
- Dynamische Footer-Links auf der Bestellseite und in Notification-E-Mails.

## Neu

- Modul `legal` mit Admin-Bereich unter `/admin/legal`.
- Oeffentliche Rechtsseiten mit konfigurierbaren Slugs wie `/impressum` oder `/datenschutz`.
- Serverseitige Vorschau fuer sanitizte Inhalte.

## Verbessert

- Notification-E-Mails koennen automatisch veroeffentlichte Rechtslinks enthalten.
- Impressum kann zentrale Vereinskontaktdaten optional automatisch einblenden.

## Behoben

- Leere oder unveroeffentlichte Rechtsseiten werden nicht mehr oeffentlich exponiert.

## Dokumentation

- README, Admin Guide, User Guide und Developer Guide aktualisiert.
- Neue ADR `014-legal-module.md` aufgenommen.

## Architektur

- Neues Registry-basiertes Extension-Point-Muster `legalContentRegistry` fuer lose Kopplung zwischen Core, Public UI und Notification-Modul.

## Betrieb & Upgrade

1. Backup erstellen: `./scripts/backup/postgres-backup.sh`
2. Images aktualisieren: `docker compose pull && docker compose up -d`
3. Backend startet neu und synchronisiert das Schema per `prisma db push`
4. Health pruefen: `curl -s http://localhost:3001/api/health`

## Breaking Changes

- Keine Breaking Changes.

## Bekannte Einschränkungen

- Der Editor verwendet bewusst schlankes HTML mit serverseitigem Sanitizing statt eines vollwertigen WYSIWYG-Editors.
- Aktualisierte Screenshots fuer das Legal-Modul (`23-legal-admin`, `24-legal-seiten`, `25-impressum`).
