# Release Notes — FestManager 1.5.0

**Veröffentlichungsdatum:** 2026-07-09

## Highlights

- Produkt-Rebranding: Die Plattform heisst jetzt **FestManager**.
- Klarere Terminologie: **Veranstalter** statt „Verein“, wo der Betreiber gemeint ist.
- Zielgruppe in der Dokumentation erweitert: Vereine, Hilfsorganisationen, Firmen, Kommunen, Foodtrucks und private Feste.

## Geändert

- Browser-Titel, PWA-Name, E-Mail-Templates, OpenAPI-Titel und Modul-Metadaten auf FestManager umgestellt.
- Admin-Bereich **Veranstalter** (ehemals „Verein & Kontakt“) mit angepassten Feldbezeichnungen.
- Repository-Referenzen: `github.com/TimUx/FestManager`, Container `ghcr.io/timux/festmanager/*`.

## Breaking Changes

- Keine funktionalen Breaking Changes.
- URLs (`/admin/verein`), API-Pfade, Datenbank und gespeicherte Konfiguration bleiben kompatibel.

## Upgrade

```bash
git pull
docker compose pull
docker compose up -d
```

## Docker Images

- `ghcr.io/timux/festmanager/backend:1.5.0`
- `ghcr.io/timux/festmanager/frontend:1.5.0`
