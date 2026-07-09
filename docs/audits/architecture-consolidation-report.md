# Abschlussbericht: Architektur-Konsolidierungsreview

| Feld | Wert |
|------|------|
| **Version** | 1.0 |
| **Datum** | 2026-07-09 |
| **Bezug** | Implementation Specification „Architecture Consolidation Review“ |
| **ADR** | [012-architecture-consolidation-review.md](../architecture/012-architecture-consolidation-review.md) |

---

## Zusammenfassung

Die Plattformarchitektur wurde gegen die externe Kritik und die Projektziele (*einfach, modular, wartbar, sicher, performant, erweiterbar*) geprüft. **Die Backend-Architektur bleibt bewusst umfangreich** — sie unterstützt Wachstum und wird von Administratoren nicht direkt wahrgenommen.

Die umgesetzten Änderungen konzentrieren sich auf **Admin-UX und Sichtbarkeit**:

- Funktionsverwaltung als verständliche Tabelle (Status, Version, Konfigurieren)
- Metadata First mit optionaler Custom-Settings-Registry (Payment)
- Platzhalter-Module ausgeblendet
- Klartext statt technischer Lifecycle-Begriffe im Dashboard

Keine Plattformkomponente wurde aus theoretischen Gründen entfernt.

---

## Bewertung aller Kritikpunkte

### 1. Ist die Plattformarchitektur zu komplex für den Funktionsumfang?

| | |
|---|---|
| **Bewertung** | **Trifft teilweise zu** |
| **Begründung** | Backend-seitig existieren EventBus, mehrere Registries, ModuleManager, SettingsService und Permission Platform — mehr als für drei produktionsreife Module (Payment, Notifications, Printer) strikt nötig. Diese Komponenten werden aber bereits genutzt (Payment-Events, dynamische Admin-UI, verschlüsselte Settings, Rollen) und bilden die Basis für weitere Module. |
| **Maßnahme** | Dokumentation in ADR-012; keine Entfernung. |

### 2. Ist die Modularchitektur unnötig kompliziert?

| | |
|---|---|
| **Bewertung** | **Trifft nicht zu (für Admins)** |
| **Begründung** | Der Lifecycle ist intern korrekt modelliert (Install bei erstem Aktivieren, Upgrade beim Image-Deploy, FAILED/UPGRADING für Fehler). Administratoren sehen nur *Aktiv* / *Deaktiviert*. |
| **Maßnahme** | `FeatureModulesPage` als Tabelle; interne API unverändert. |

### 3. Sind Begriffe wie install / enable / activate / initialize / shutdown / upgrade / migration für Admins sichtbar?

| | |
|---|---|
| **Bewertung** | **Trifft teilweise zu** (historisch) / **Trifft nicht zu** (aktuell) |
| **Begründung** | Frühere Modulverwaltungs-UI zeigte Lifecycle-Status. Nach Produkt-Review (Phase B): Seite heißt „Funktionen“, Toggle = An/Aus, keine Migrations-Buttons. Dashboard: „Funktionsstatus“ statt „Modul-Gesundheit“, Chips auf Deutsch. |
| **Maßnahme** | Labels weiter vereinfacht; Lifecycle bleibt Backend-intern. |

### 4. Metadata First — generische Formulare vs. individuelle Oberflächen

| | |
|---|---|
| **Bewertung** | **Trifft teilweise zu** |
| **Begründung** | `core.club`, `core.order`, `module.notifications`, `module.printer` funktionieren gut mit `DynamicSettingsForm`. Zahlung braucht Presets, Provider-Verwaltung und Test-Buttons — eine reine Schema-UI wäre unübersichtlich. |
| **Maßnahme** | Architektur: Standard = generisch; optional = `settingsPages.tsx`. Payment → `PaymentAdminPage`. Notifications/Printer → generisch + `settingsExtensions.tsx` (SMTP-Test, Drucker-Test). |

### 5. Platzhalter-Module (Inventory, Analytics, Voucher, …)

| | |
|---|---|
| **Bewertung** | **Trifft zu** |
| **Begründung** | Sieben Stub-Module ohne Funktion würden die Plattform unfertig wirken lassen. |
| **Maßnahme** | `productionReady: false`; Backend-Filter; Frontend zeigt nur `payment`, `notifications`, `printer`. |

### 6. Core vs. Module — Kopplung

| | |
|---|---|
| **Bewertung** | **Trifft teilweise zu** |
| **Begründung** | Alle produktiven Module nutzen relative Imports zu `src/platform/`, `src/module-system/`, Prisma, Middleware. Das ist für **gemeinsam ausgelieferte** Module technisch notwendig und akzeptabel. Problematisch wäre es nur bei echten Third-Party-Plugins — das ist kein 1.0-Ziel. |
| **Kopplungstyp** | |
| → Platform-Typen, Extension Points | notwendig, akzeptabel |
| → Prisma-Repositories in Payment | notwendig, akzeptabel |
| → `emitPrintJob` / Socket in Printer | notwendig, akzeptabel |
| → Vollständige Core-Isolation | nicht Ziel |

| **Maßnahme** | Dokumentation; keine Entkopplung. |

### 7. Admin-Bereich — Verständlichkeit für Administratoren

| | |
|---|---|
| **Bewertung** | **Trifft teilweise zu** |
| **Begründung** | Nach vorherigen Phasen: Setup-Assistent, vereinfachte Navigation, Rollen-Presets, Klartext-Fehler. Verbleibende technische Reste: Webhook-URL in Payment-Test-Extension, Drucker-Slot-Namen (`printer1`). |
| **Maßnahme** | Dashboard-Labels; Funktionen-Tabelle. Webhook-Hinweis bleibt (für Stripe-Konfiguration hilfreich). |

### 8. UX Review (öffentliche Bestellung, Kasse, Küche, Admin)

| | |
|---|---|
| **Bewertung** | **Trifft teilweise zu** |
| **Bereich** | |
| Öffentliche Bestellung | Nachname-Pflicht für Status, sichere Token-URLs — gut |
| Kassenmodus / Küche | Fokussiert; Reconnect-Banner für Helfer |
| Administration | Navigation reduziert (Team, Funktionen, Einstellungen) |
| Module | Nur produktionsreife Funktionen sichtbar |
| Settings | Mix aus generisch + Payment-Presets |

| **Maßnahme** | Bereits in Phase A–C umgesetzt; Konsolidierung ergänzt Modul-UI und Settings-Registry. |

### 9. Konfiguration — zu viele Entscheidungen?

| | |
|---|---|
| **Bewertung** | **Trifft teilweise zu** |
| **Begründung** | Setup-Assistent und Payment-Presets adressieren das. Notifications bieten viele Kanäle — sinnvoll, aber optional konfigurierbar. |
| **Maßnahme** | Keine weiteren Optionen entfernt (Funktionalität). Defaults in `module.json` und Schemas beibehalten. |

### 10. Modulverwaltung — nur Modul, Status, Version, Konfigurieren

| | |
|---|---|
| **Bewertung** | **Trifft teilweise zu** (vorher) / **umgesetzt** |
| **Maßnahme** | `FeatureModulesPage`: Tabelle mit Funktion, Status (Aktiv/Deaktiviert), Version, Konfigurieren-Button, Schalter. |

### 11. Plattformkomponenten — praktischer Nutzen

| Komponente | Nutzen heute | Entscheidung |
|------------|--------------|--------------|
| EventBus | Payment-Events | Behalten |
| Registry (Metadata, Extension Points) | Admin-UI, Payables, Printer | Behalten |
| SettingsService | Alle Admin-Settings | Behalten |
| ModuleManager | Lifecycle, Upgrades | Behalten |
| Permission Platform | Rollen, API-Guards | Behalten |
| HealthService | Dashboard-Funktionsstatus | Behalten |

---

## Durchgeführte Änderungen

| Datei / Bereich | Änderung |
|-----------------|----------|
| `frontend/src/pages/admin/FeatureModulesPage.tsx` | Tabellen-UI: Funktion, Status, Version, Konfigurieren |
| `frontend/src/admin/settingsPages.tsx` | **Neu:** Registry für optionale Custom-Settings-Seiten |
| `frontend/src/pages/admin/DynamicAdminPage.tsx` | Routing: Custom Settings vor GenericSettingsPage |
| `frontend/src/pages/admin/AdminDashboardPage.tsx` | „Funktionsstatus“, deutsche Status-Chips |
| `docs/architecture/012-architecture-consolidation-review.md` | **Neu:** ADR mit Entscheidungslogik |
| `docs/architecture/003, 004, 006` | Review-Abschnitte ergänzt |

*Bereits vor diesem Review (Phase A–C):* Setup-Assistent, sichere Order-URLs, Session-Revocation, `productionReady`-Filter, Navigation, Payment-Presets, Rollen-Presets, API v1, Operations-Doku.

---

## Bewusst NICHT durchgeführte Änderungen

| Vorschlag / Kritik | Warum nicht |
|--------------------|-------------|
| Modularchitektur vereinfachen / entfernen | Lifecycle intern nötig; UX bereits abstrahiert |
| SettingsService, EventBus, HealthService entfernen | Aktiver Nutzen + Erweiterbarkeit |
| Vollständige Plugin-Isolation | Offizielle Module im selben Image |
| Stub-Module aus Codebase löschen | Entwicklungs-Vorlagen; Filter reicht |
| Alle Settings-Seiten hardcodieren | Metadata First skaliert besser |
| Route-Unmount bei Deaktivierung | Technische Schuld, kein UX-Problem (404-Guard) |
| Mail/Printer komplett eigene Seiten | Generische Formulare + Extensions ausreichend für 1.0 |

---

## Auswirkungen

### Architektur

- Keine strukturellen Backend-Änderungen
- Klare Schicht: **intern komplex, extern einfach**
- Dokumentierte Kopplung Core ↔ Module
- Metadata First + optionale Frontend-Registry als etabliertes Muster

### UX

- Administratoren sehen keine Lifecycle-Begriffe
- Funktionen-Seite entspricht der Spezifikation
- Payment-Einstellungen über kuratierte Oberfläche
- Dashboard-Sprache verständlicher

### Wartbarkeit

- ADR-012 als Referenz für zukünftige Reviews
- Custom Settings über eine zentrale Registry — kein Sonder-Routing in `App.tsx`
- `productionReady`-Flag als einheitliches Kriterium für Sichtbarkeit

---

## Empfehlung für Version 1.0

**Freigabe empfohlen**, sofern die operativen Maßnahmen aus Phase A erledigt sind:

1. `npx prisma migrate deploy` auf bestehenden Installationen
2. `APP_ENCRYPTION_KEY` gesetzt und dokumentiert
3. Smoke-Tests (Auth, Bestellung, Payment-Preset, Funktionen-Toggle)

Die Architektur ist für Wachstum vorbereitet; die Oberfläche ist für Administratoren verständlich genug für 1.0. Weitere Vereinfachung sollte **nur UX-getrieben** erfolgen — nicht durch Abbau von Erweiterungspunkten.

**Priorität nach 1.0:**

- Drucker-Slot-Labels benutzerfreundlicher („Küche“, „Theke“)
- Lazy Loading der Admin-Pages
- Route-Unmount bei Modul-Deaktivierung (technische Schuld)

---

*Erstellt im Rahmen des Architektur-Konsolidierungsreviews. Siehe auch [massnahmenplan-architektur-produkt.md](./massnahmenplan-architektur-produkt.md) und [independent-architecture-product-review.md](./independent-architecture-product-review.md).*
