# ADR-014: Legal Module

| Feld | Wert |
|------|------|
| **Status** | Accepted (implementiert) |
| **Datum** | 2026-07-09 |

## Ziel

Rechtlich relevante Inhalte wie Impressum, Datenschutzerklärung, AGB und Widerrufsbelehrung als optionales offizielles Modul bereitstellen, ohne die Standardinstallation für rein lokale Veranstaltungen zu verkomplizieren.

## Motivation

Viele Vereine benötigen für Online-Bestellungen veröffentlichte Rechtstexte. Andere Vereine betreiben die Plattform ausschließlich lokal und benötigen keine zusätzlichen öffentlichen Seiten. Deshalb muss die Lösung:

- vollständig optional sein
- sich in die bestehende Modularchitektur integrieren
- keine Core-Sonderlogik für einzelne Seiten einführen
- veröffentlichte Inhalte sicher rendern

## Architekturentscheidung

### Modulgrenze

Das Modul `legal` lebt unter `backend/modules/legal/` und integriert sich über:

- `ModuleManager`
- `SettingsService`
- `MetadataRegistry`
- `PermissionService`
- `ServiceContainer` / Extension Points
- `Notification`-Modul

Der Core kennt keine einzelnen Rechtstexte. Er konsumiert nur den Extension Point `legalContentRegistry`.

### Datenhaltung

Es gibt zwei Ebenen:

1. **Modulkonfiguration** in `module.legal`
   - `appendClubContactToImprint`
   - `showFooterLinks`
   - `showNotificationLinks`
2. **Seiteninhalte** in `legal_pages`
   - `page_type`
   - `title`
   - `slug`
   - `enabled`
   - `published`
   - `content_html`
   - `updated_at`

Die Seiteninhalte liegen bewusst nicht im Settings-Namespace, weil sie redaktionelle Inhalte mit eigener Veröffentlichungslogik und URL-Identität darstellen.

### Routing

Öffentliche Frontend-Routen bleiben sprechend, z. B.:

- `/impressum`
- `/datenschutz`
- `/agb`
- `/widerruf`

Der Core stellt dazu neutrale API-Endpunkte bereit:

- `GET /api/public/legal-links`
- `GET /api/public/legal/:slug`

Die API verwendet intern ausschließlich `legalContentRegistry`.

### Veröffentlichungslogik

Eine Seite ist nur öffentlich sichtbar, wenn alle Bedingungen erfüllt sind:

- Modul aktiviert
- Seite aktiviert
- Seite veröffentlicht
- Inhalt vorhanden

Leere Seiten erscheinen nie im Frontend und nie in Footer- oder E-Mail-Links.

### Notification-Anbindung

Das Notification-Modul ergänzt E-Mail-Texte um veröffentlichte Rechtslinks, wenn:

- das Legal-Modul aktiv ist
- `showNotificationLinks` aktiv ist
- veröffentlichte Seiten vorhanden sind

Dadurch bleibt die Integration lose gekoppelt: `notifications` fragt nur den Extension Point ab.

### Rechte

Neue Berechtigungen:

- `legal.view`
- `legal.manage`
- `legal.publish`

Die Admin-Seite `Administration -> Module -> Rechtliche Informationen` erfordert mindestens `legal.view`. Änderungen und Veröffentlichungen werden getrennt berechtigt.

### Sicherheit

Die Eingabe erfolgt als schlankes HTML. Vor Speicherung und Vorschau wird serverseitig sanitizt. Erlaubt sind nur begrenzte Tags und Attribute wie:

- Überschriften
- Absätze
- Listen
- Tabellen
- Links
- Fett / Kursiv

Unsichere Tags und Attribute werden entfernt, um XSS zu verhindern.

## Vorteile

- Standardinstallation bleibt schlank
- saubere Wiederverwendung für Footer und Benachrichtigungen
- keine hardcodierten Core-Seiten
- veröffentlichte Inhalte zentral steuerbar

## Nachteile

- eigenes Redaktionsmodell zusätzlich zu Settings
- HTML-Editor bewusst einfach gehalten; kein vollwertiger WYSIWYG-Stack

## Alternativen

| Alternative | Bewertung |
|-------------|-----------|
| Rechtstexte direkt im Core | Widerspricht der Modulstrategie |
| Inhalte vollständig im SettingsService ablegen | Schwächeres Modell für Veröffentlichungsstatus und Slugs |
| Externe CMS-Anbindung | Zu komplex für die Zielgruppe kleiner Vereine |

## Auswirkungen

- Öffentliche Bestellseite kann dynamische Footer-Links anzeigen
- Notifications erhalten optionale Rechtslinks im Footer
- Impressum kann zentrale Vereinskontaktdaten automatisch ergänzen
- Ohne aktiviertes Modul bleibt das Verhalten unverändert
