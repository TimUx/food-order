# Changelog

## 1.4.0 - 2026-07-09

### Neu

- Offizielles Modul `legal` fuer Impressum, Datenschutz, AGB und Widerrufsbelehrung hinzugefuegt.
- Oeffentliche Rechtsseiten mit konfigurierbaren Slugs und dynamischem Footer auf der Bestellseite eingefuehrt.
- Rechtslinks automatisch in Notification-E-Mails integriert, wenn veroeffentlichte Seiten vorhanden sind.

### Verbessert

- Rechtstexte werden serverseitig sanitizt, bevor sie gespeichert oder ausgerendert werden.
- Vereins-Kontaktdaten koennen optional automatisch im Impressum ergaenzt werden.

### Behoben

- Versehentliche Anzeige leerer oder unveroeffentlichter Rechtsseiten wird verhindert.

### Dokumentation

- README, Admin Guide, User Guide, Developer Guide und Architektur-ADRs fuer das Legal-Modul aktualisiert.
