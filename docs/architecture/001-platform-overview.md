# ADR-001: Platform Overview

| Feld | Wert |
|------|------|
| **Status** | Accepted |
| **Datum** | 2026-07-08 |
| **Kontext** | FestSchmiede-Plattform für Essensvorbestellungen bei Veranstaltungen |

## Ziel

Eine skalierbare, modulare Webplattform bereitstellen, mit der Vereine Vorbestellungen annehmen, Küche und Abholung steuern und optional Onlinezahlung aktivieren können – ohne dass Vereine mit reiner Barzahlung betroffen sind.

## Motivation

Vereine benötigen eine einfache, touch-optimierte Lösung für Veranstaltungstage. Die Plattform muss:

- ohne Registrierung für Endkunden funktionieren
- Echtzeit-Updates für Küche und Abholboard liefern
- optional erweiterbar sein (Zahlung, Druck, Benachrichtigungen)
- per Docker mit minimalem Betriebsaufwand deploybar sein

## Architekturentscheidung

**Modularer Monolith** mit klar getrennten Bereichen:

```
┌─────────────────────────────────────────────────────────────────┐
│                        FestSchmiede-Plattform                   │
├──────────────┬──────────────────────┬─────────────────────────────┤
│   Frontend   │       Backend        │        PostgreSQL           │
│  React SPA   │  Express + Module    │   Core + Modul-Tabellen     │
│  (nginx/PWA) │  System              │                             │
└──────────────┴──────────────────────┴─────────────────────────────┘
         │                    │                      │
         └──── REST + WS ─────┘                      │
                              └──── Prisma / Raw SQL ┘
```

### Bereiche

| Bereich | Zielgruppe | Technologie |
|---------|------------|-------------|
| Öffentlich | Endkunden | React, `/`, `/status`, `/abholboard` |
| Mitarbeiter | Küche, Abholung, Service | React, `/mitarbeiter/*` |
| Administration | Vereins-Admins | React, `/admin/*` |
| API | Alle Clients | Express `/api/*` |
| Module | Erweiterungen | `backend/modules/*` im Docker-Image |

### Deployment

- **Docker Compose** mit PostgreSQL, Backend, Frontend
- Images aus **GHCR** (`ghcr.io/timux/festschmiede/{backend,frontend}`)
- Module werden **mit dem Backend-Image** ausgeliefert (`/app/modules`)
- Kein separates Modul-Download zur Laufzeit

## Vorteile

- Einfacher Betrieb für Vereine (ein `docker compose pull && up`)
- Klare Trennung öffentlich / Mitarbeiter / Admin
- Module optional – Zero-Impact bei Deaktivierung
- Ein Repository, ein Deployment-Pipeline

## Nachteile

- Monolith skaliert horizontal nur mit gemeinsamer DB und Session-State
- Module sind compile-time an Core gebunden (`import ../../src/...`)
- Kein separates Plugin-Marketplace (noch)

## Alternativen

| Alternative | Warum nicht gewählt |
|-------------|---------------------|
| Microservices pro Modul | Zu hoher Betriebsaufwand für Vereine |
| WordPress-Plugin-Modell | Passt nicht zu Echtzeit-Küchenworkflow |
| SaaS-Multi-Tenant | Aktuell Single-Tenant pro Verein (eine Instanz) |
| Serverless | WebSocket/Küche erfordert persistente Verbindungen |

## Auswirkungen

- Alle offiziellen Module müssen im Docker-Build enthalten sein
- Releases lösen Image-Build aus (GitHub Actions `docker-publish.yml`)
- Dokumentation in `docs/` ist Teil des Produkts
- Versionierung über Git-Tags und `IMAGE_TAG` in `.env`

## Migrationsstrategie

Keine Migration nötig – beschreibt den aktuellen Gesamtrahmen. Weitere ADRs: [README](./README.md).

## Offene Punkte

- [x] Multi-Tenant-Fähigkeit (mehrere Vereine pro Instanz) – **v2.0 geplant, siehe ADR-020–027**
- [ ] Community-Plugins aus `/app/plugins` – vorbereitet, nicht aktiv
- [ ] Horizontale Skalierung (mehrere Backend-Instanzen + Redis Adapter für Socket.IO)
- [ ] `package.json`-Versionen (1.0.0) vs. Release-Tags (v1.2.0) angleichen
