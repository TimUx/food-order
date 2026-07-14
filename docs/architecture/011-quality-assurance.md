# ADR-011: Quality Assurance Plattform

| Feld | Wert |
|------|------|
| **Status** | Accepted |
| **Datum** | 2026-07-08 |
| **Kontext** | Modulare Plattform mit Payment, Notifications, Printer; CI muss ohne Workflow-Änderungen bei neuen Modulen skalieren |

## Ziel

Vollständig automatisierte QS- und CI-Plattform für jeden Commit, Pull Request, Merge, Release und Nightly Build. Neue Module dürfen **keine** Änderungen an GitHub Actions erfordern.

## Architekturentscheidung

Die QA-Plattform ist **Bestandteil der Plattformarchitektur**, nicht ein separates Testframework:

| Komponente | Rolle in QA |
|------------|-------------|
| `ModuleDiscovery` + `module.json` (`qa`-Block) | Registriert Szenarien, Seeds, Tests |
| `QaRegistry` | Sammelt QA-Metadaten ohne hartcodierte Modulnamen |
| `ModuleScenarioRunner` | Szenarien `none`, `only-{id}`, `all` über `ModuleManager` |
| `HealthService` | Health-Checks pro Szenario |
| `QaReportBuilder` | Einheitliche Zusammenfassung (JSON + Markdown) |
| `SettingsService` / API | Settings-Tests in API-Suite |
| `ServiceContainer` | Gleiche Bootstrap-Umgebung wie Produktion |

### Keine hartcodierten Module

Szenarien werden dynamisch aus `QaRegistry.scenarioModuleIds()` erzeugt. Module deklarieren in `module.json`:

```json
"qa": {
  "participatesInScenarios": true,
  "providesSeed": true,
  "integrationTest": "qa/integration.test.ts",
  "apiTest": "qa/api.test.ts"
}
```

`participatesInScenarios` default: `true`. Setzen auf `false` für reine Stub-Module.

## Teststrategie

```
┌─────────────┐   ┌──────────────┐   ┌─────────────┐   ┌──────────┐
│ Unit        │ → │ Integration  │ → │ API         │ → │ E2E      │
│ (Vitest)    │   │ (DB+Module)  │   │ (Supertest) │   │(Playwright)│
└─────────────┘   └──────────────┘   └─────────────┘   └──────────┘
       │                  │                  │                │
       └──────────────────┴──────────────────┴────────────────┘
                                    │
                          artifacts/qa-summary.md
```

| Ebene | Verzeichnis | Wann |
|-------|-------------|------|
| Unit | `backend/`, `frontend/`, `tests/unit/` | Jeder Push/PR |
| Integration | `tests/integration/` | Nach Docker-Start |
| API | `tests/api/` | Gegen laufendes Backend |
| Modul | `backend/modules/*/qa/` | Discovery via `QaRegistry` |
| E2E | `tests/e2e/specs/` | Playwright gegen Frontend |
| Performance | `scripts/qa/performance-baseline.ts` | Nightly + optional CI |
| Security | `scripts/qa/security-audit.ts`, `npm audit` | Jeder PR + Nightly |

## Testarten

- **Unit:** Plattform, Module, Utils (Vitest)
- **Integration:** Modul-Szenarien, DB-abhängige Flows
- **API:** Auth, Events, Menu, Admin/Modules, Settings, Health
- **E2E (Smoke):** Admin, Bestellung, Küche, Abholung, Logout (`npm run qa:e2e`)
- **E2E (Nutzerreise):** Serialer 12-Schritte-Flow von Mandantenbewerbung bis DSGVO-Löschung (`npm run qa:e2e:journey`, `PLAYWRIGHT_WORKERS=1`)
- **Payment (optional):** Nur Stripe Sandbox wenn konfiguriert
- **Mail:** Mailpit in `docker-compose.ci.yml` – keine echten Mails
- **Printer:** Virtuelle Adapter (PDF/Browser) – keine Hardware
- **Notifications:** Mock-Kanäle im Modul

## Build Pipeline (Phasen)

1. Checkout, Node, Cache, `npm ci`
2. Codequalität: ESLint, TypeScript Build, Depcheck
3. Unit Tests + Coverage → `artifacts/coverage/`
4. Docker: Postgres, Redis, Mailpit, Backend, Frontend + Health Checks
5. Migrationen (`prisma db push`) + Seed + `tests/seeds/qa-seed.ts`
6. Modul-Szenarien via `ModuleScenarioRunner`
7. API-Tests (Supertest)
8. Playwright E2E

## GitHub Actions

| Workflow | Trigger | Zweck |
|----------|---------|-------|
| `quality-assurance.yml` | push, PR, dispatch | Statische Qualität, Smoke-E2E, separater Job **Realistische Nutzerreise** |
| `nightly.yml` | cron 02:00 UTC | Lasttest (1000 Bestellungen), Nutzerreise, Performance |
| `release-validation.yml` | Release, dispatch | Release-Gate (Nutzerreise + Security), danach **GHCR Image-Build** |
| `dependency-review.yml` | PR | Dependency Review + npm audit |

## Docker

`docker-compose.ci.yml` – CI-spezifischer Stack (Build aus lokalen Dockerfiles):

- `postgres`, `redis`, `mailpit`, `backend`, `frontend`
- Health Checks auf `/api/health` und Frontend-Root

## Testdaten

| Quelle | Inhalt |
|--------|--------|
| `backend/prisma/seed.ts` | Basis: Admin, Küche, Sommerfest, Gerichte |
| `tests/seeds/qa-seed.ts` | Erweitert: Verkauf, Club, N Bestellungen |
| Demo-Modus | `QA_DEMO_MODE=1`, 50 Bestellungen |
| Nightly | `QA_ORDER_COUNT=1000` |

Credentials (nur Test): `admin@verein.local` / `admin123`, `kueche@verein.local` / `staff123`

## Modulunterstützung

Neues Modul registriert ausschließlich in `module.json`:

1. `healthChecks` – für `HealthService`
2. `qa.providesSeed` – optionale Seed-Hooks (zukünftig)
3. `qa.integrationTest` – relativer Pfad zum Vitest
4. `qa.apiTest` – optionale API-Tests

`scripts/qa/run-module-tests.ts` führt registrierte Tests ohne Workflow-Änderung aus.

## Artefakte (`artifacts/`)

| Artefakt | Pfad |
|----------|------|
| Coverage | `coverage/` |
| Playwright HTML | `playwright/html/` |
| JUnit | `playwright/junit.xml`, `junit-api.xml` |
| Screenshots/Videos | `playwright/test-results/` |
| Container Logs | `container-logs.txt` |
| Modul-Szenarien | `module-scenarios.json` |
| Performance | `performance.json` |
| Security | `security.json` |
| Zusammenfassung | `qa-summary.json`, `qa-summary.md` |

Alle Artefakte werden als GitHub Actions Artifacts hochgeladen.

## Reports

`QaReportBuilder` erzeugt nach jedem Lauf:

- Bestandene / fehlgeschlagene Tests pro Phase
- Coverage (Lines %)
- Modul-Szenario-Status
- Performance-Kennzahlen

`npm run qa:report` aggregiert vorhandene JSON-Artefakte.

## Releaseprozess

Ein Release ist nur zulässig wenn `release-validation.yml` erfolgreich:

- Build, Docker, Migrationen, Health
- Unit, Nutzerreise-E2E, Security
- Anschließend Push der Images `ghcr.io/<owner>/FestSchmiede/{backend,frontend}` mit Release-Tag

## Demo-Testmodus

```bash
npm run qa:seed:demo   # 50 Bestellungen
npm run qa:e2e:demo    # Seed + Playwright
```

## Best Practices

1. **Keine Modulnamen in Workflows** – nur generische `npm run qa:*` Skripte
2. **Idempotente Seeds** – `upsert` für CI-Wiederholbarkeit
3. **Sandbox only** – Payment/ Mail nur über Mailpit/Stripe Test Keys
4. **Fehler-Artefakte** – Playwright Screenshots/Videos, Container-Logs bei `if: always()`
5. **Reproduzierbarkeit** – `docker-compose.ci.yml` + feste Test-Credentials

## Verzeichnisstruktur

```
tests/
  unit/ integration/ api/ e2e/ performance/ security/ module/
  fixtures/ seeds/
scripts/qa/
  run-module-scenarios.ts, run-module-tests.ts, generate-report.ts, ...
.github/workflows/
  quality-assurance.yml, nightly.yml, release-validation.yml, dependency-review.yml
  # Image-Build: Job in release-validation.yml (nicht separater Workflow)
```

## Offene Punkte

- Stripe Sandbox E2E wenn Secrets in CI hinterlegt
- Modul-spezifische Seed-Hooks über `EventBus`
- Redis-Nutzung in Tests wenn Module Cache nutzen
- `prisma migrate deploy` statt `db push` für produktionsnahe CI

## Verwandte ADRs

- [003 – Module System](./003-module-system.md)
- [007 – Payment](./007-payment-module.md)
- [008 – Notifications](./008-notification-module.md)
- [009 – Printing](./009-printing-module.md)
