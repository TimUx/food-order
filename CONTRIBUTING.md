# Contributing

Vielen Dank für Ihr Interesse an der FestSchmiede-Plattform!

## Entwicklungsumgebung

1. Repository klonen
2. `docker compose up` oder `npm run qa:docker:up` für CI-Stack
3. Backend: `cd backend && npm ci && npm run dev`
4. Frontend: `cd frontend && npm ci && npm run dev`

## Tests

```bash
npm ci && npm ci --prefix backend && npm ci --prefix frontend
npm run qa:unit
npm run qa:api
npm run qa:e2e
```

## Pull Requests

- Kleine, fokussierte Änderungen
- Tests für neue Funktionen
- Deutsche UI-Texte für Endanwender
- Keine Secrets committen

## Modul-Entwicklung

Siehe [ADR-003](docs/architecture/003-module-system.md) und [Developer Guide](docs/DEVELOPER_GUIDE.md).

Neue Module registrieren QA-Metadaten in `module.json` – keine Workflow-Änderungen nötig.
