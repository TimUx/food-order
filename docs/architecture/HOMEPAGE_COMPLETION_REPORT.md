# Homepage & Mandantenbewerbungsportal – Abschlussbericht

## Neue öffentliche Seiten

| Route | Inhalt |
|-------|--------|
| `/` | Landingpage mit Hero, Funktionen, Screenshots, Vorteile, Zielgruppen, Open Source, CTA |
| `/funktionen` | Funktionsübersicht |
| `/screenshots` | Plattform-Screenshots |
| `/open-source` | Open-Source-Bereich mit GitHub-Link |
| `/ueber-das-projekt` | Projektvorstellung |
| `/ueber-den-entwickler` | Entwicklervorstellung |
| `/fuer-vereine` | Zielgruppe Vereine |
| `/mandant-beantragen` | Bewerbungsformular |
| `/mandant-beantragen/bestaetigung` | Bestätigungsseite |
| `/faq` | Häufige Fragen |
| `/kontakt` | Kontakt (aus Plattform-Einstellungen) |
| `/rechtliches/:slug` | Dynamische Rechtsseiten |
| `/dokumentation` | Dokumentationsverweis (bestehend) |

## Routing

- `www.<domain>` → Plattform-Scope (reservierte Subdomain `www`)
- `<apex-domain>` → Plattform-Scope
- `<tenant>.<domain>` → Mandanten-Scope

Kein separates Frontend-Projekt; alle Seiten nutzen `PlatformRoutes` und `PlatformPublicLayout`.

## Bewerbungsworkflow

1. **Einreichung:** `POST /api/public/tenant-applications` (Rate-Limit: 5/h)
2. **Speicherung:** Tabelle `tenant_applications`
3. **Benachrichtigung:** E-Mail an Plattformadministratoren + Bestätigung an Antragsteller (`platformNotificationService`)
4. **Prüfung:** `/platform/bewerbungen` – Status, Kommentar, Genehmigung/Ablehnung
5. **Genehmigung:** Optional automatische Mandantenerstellung via `PlatformTenantAdminService`

Voraussetzung: `platform.registration.enabled = true` in Plattform-Einstellungen.

## Plattformverwaltung

| Bereich | Pfad |
|---------|------|
| Mandantenanträge (Liste) | `/platform/bewerbungen` |
| Antrag-Detail | `/platform/bewerbungen/:id` |
| Rechtliche Seiten | `/platform/rechtliches` |
| Einstellungen (Kontakt, Bewerbungen) | `/platform/einstellungen` |

Statuswerte: `NEW`, `UNDER_REVIEW`, `CLARIFICATION`, `APPROVED`, `REJECTED`, `ARCHIVED`.

## Rechtliche Seiten

- Modell `platform_legal_pages` – Impressum, Datenschutz, Nutzungsbedingungen
- **Keine Mustertexte** – nur technische Infrastruktur
- Footer-Links erscheinen nur bei `published=true` und nicht-leerem `contentHtml`

## SEO & Barrierefreiheit

- `BrandingHead`: Title, Meta Description, OpenGraph, Twitter Cards, Canonical, JSON-LD
- Responsive Layout (MUI Grid, mobile Navigation)
- Helle Farben, klare CTAs

## Cookie-Banner

Aktuell nur technisch notwendige Cookies → kein Banner. Vorbereitung in `frontend/src/lib/consent.ts` für künftige Analyse/Marketing-Dienste.

## Tests

| Test | Datei |
|------|-------|
| API Plattform public | `tests/api/platformPublic.test.ts` |
| Service Unit | `backend/src/platform/TenantApplicationService.test.ts` |
| Legal Service | `backend/src/platform/PlatformLegalService.test.ts` |
| Playwright Homepage | `tests/e2e/specs/homepage.spec.ts` |

## Dokumentation

- `README.md` – Routing & Homepage
- `docs/ADMIN_GUIDE.md` – Bewerbungsworkflow, Rechtliches
- `docs/DEVELOPER_GUIDE.md` – neue APIs
