# Independent Architecture & Product Review — food-order Platform

Date: 2026-07-09  
Reviewer stance: external architecture, product, UX, security, DevOps, QA, and open-source audit before first public release.

## Executive Summary

food-order is a promising single-tenant modular monolith for association event food ordering, but it is not yet ready for a low-risk public 1.0 release. The core product idea is strong: public no-login ordering, staff kitchen and pickup flows, admin configuration, Docker deployment, screenshots, and a serious QA pipeline. The repository also shows unusual discipline for a young open-source project: architecture decision records, module lifecycle documentation, tests, CI, security scripts, and release validation exist.

The main problem is strategic over-engineering. The architecture has a platform kernel, module registry, service container, extension points, metadata registries, settings platform, permissions, lifecycle states, migrations, health checks, admin metadata, and placeholder modules. This is a lot of moving parts for the first public version of software aimed at volunteer-run clubs. Some of that complexity is valid internally, but it is starting to leak into admin concepts such as module installation, activation, configuration, health, provider setup, and advanced settings. The guiding product principle should be: if a club volunteer cannot understand it under event-day pressure, it should not be visible in the primary UI.

The second major issue is security hardening. The backend uses JWT bearer auth, CORS, Helmet, rate-limit support, permissions, and encrypted settings, but several release-blocking concerns remain: no evident refresh-token/session revocation model, static uploads need stricter file-serving guarantees, public order-status URLs appear guessable if based only on order IDs, default demo credentials are documented too prominently, module SQL migrations are raw SQL, and plugin/module trust boundaries are not mature enough for third-party extensions.

The third major issue is operational reliability. Docker Compose is the right deployment target for clubs, but the README still promotes automatic schema synchronization via `prisma db push` at startup. That is convenient for development, but it is a dangerous public-release default because it bypasses a controlled migration and rollback story. For small clubs, recovery from a broken deployment must be easier than the deployment itself.

## Scores

| Area | Score | Assessment |
|---|---:|---|
| Overall Architecture | 6/10 | Good modular-monolith direction, but too many platform abstractions for current product maturity. |
| Product Quality | 7/10 | Clear core workflows and useful screenshots; too much admin/module complexity risks confusing target users. |
| User Experience | 6/10 | Touch-first staff flows are a strength; admin and module settings need simplification and guided setup. |
| Security | 5/10 | Basic controls exist, but session, secrets, upload, public status, backup, and plugin trust risks block 1.0. |
| Performance | 6/10 | Adequate for small events; unproven for 1000+ concurrent users and multi-instance WebSocket use. |
| Maintainability | 6/10 | TypeScript, tests, ADRs help; duplicate module-system/platform paths and placeholder modules hurt clarity. |
| Scalability | 5/10 | Single-instance design is fine for clubs, but horizontal scaling and WebSocket fanout remain open. |
| Open Source Readiness | 7/10 | Good README/docs/CI; missing stronger release, security policy, issue templates, and operator runbooks. |
| Release Readiness | 5/10 | Release candidate possible; public stable release should wait for security, migration, and UX simplification. |

## Architecture Review

### What is good

- The modular-monolith choice is correct for the domain. Clubs should not operate microservices.
- The separation between public, staff, admin, API, modules, and database is understandable.
- Shipping official modules inside Docker images is a conservative and secure choice for now.
- The documentation explicitly acknowledges current architectural drawbacks, including relative imports from modules into core, no route unmounting, stub module overhead, and duplicate import paths.
- Prisma plus PostgreSQL is a reasonable default for relational ordering data.

### What is bad

- The platform layer is too ambitious for the current product. There are two parallel concepts: `backend/src/platform` and `backend/src/module-system`, with the latter acting as compatibility re-exports. This is transitional technical debt and should not survive 1.0.
- The module lifecycle vocabulary is too heavy: install, enable, activate, disable, deactivate, initialize, shutdown, upgrade, health check, migration, image version, schema version. Internally that may be acceptable; externally it is excessive.
- Metadata-driven admin UI is powerful, but risks creating generic forms that are technically correct and human-hostile. Vereinsadmins need workflows, not schema renderers.
- Placeholder modules such as inventory, loyalty, voucher, discount, check-in, analytics, and cash-register create the impression of breadth without real product completeness.
- There is no strong boundary between core and official modules. Relative imports from modules into core mean this is not a true plugin architecture; it is feature packaging.

### Clean architecture, coupling, cohesion, SOLID

The backend is organized into controllers, services, repositories, middleware, platform, core, and modules. That looks clean on paper, but the platform concerns are large enough that they may become the gravitational center of the codebase. The architecture is cohesive around extensibility but less cohesive around user workflows. For this domain, the primary cohesion should be event-day ordering operations: order creation, kitchen preparation, pickup, cancellation, payment, and reporting.

### Would I design it differently?

Yes. I would keep the modular monolith but simplify the release-1 architecture:

1. Core product modules: ordering, staff operations, admin setup.
2. Optional built-in capabilities: payment, notifications, printing.
3. Internal feature registry only; no user-facing install/upgrade lifecycle in v1.
4. One settings system, but curated forms for club admins instead of generic schema forms where possible.
5. Third-party plugin architecture explicitly postponed until after a stable public release.

## Product Review

The platform solves a real problem: many local events need preorders, kitchen tracking, pickup numbers, and simple admin. The public ordering and staff kitchen/pickup flows are the product's strongest areas. The screenshots and German route labels suggest the project understands the local association use case.

However, the product risks drifting toward a developer showcase instead of a volunteer tool. The existence of module health, module activation, payment provider metadata, and generic settings pages is useful for maintainers, but it should be hidden behind very simple presets:

- “We only accept cash.”
- “We accept cash and card at pickup.”
- “We accept online payment.”
- “We print kitchen tickets.”
- “We notify kitchen by email/ntfy.”

A cashier does not care about payment provider abstractions. A club president does not care about lifecycle states. A kitchen volunteer does not care about module metadata. They care whether orders are visible, correct, printable, and easy to mark ready.

## UX Review by Persona

### Customer

Strengths:
- No registration is the correct default.
- Order status page and pickup board are useful.
- Branding and contact page improve trust.

Weaknesses:
- Public order-status access must be designed for privacy. A URL containing only an order ID is not enough if IDs are discoverable.
- Error messages should be written for non-technical users and event-day situations, e.g. “Online ordering is closed. Please order at the counter.”
- Cancellation deadlines must be explained in plain language at order time.

### Kitchen Staff

Strengths:
- Tablet-optimized kitchen view with large buttons is exactly right.
- Status transitions are simple enough for volunteers.

Weaknesses:
- Kitchen views should have an offline/reconnect state that is painfully obvious.
- The system needs a no-training mode: large order number, items, notes/allergens if added, and one primary action.
- It should support accidental-tap recovery for event-day stress.

### Cashier

Strengths:
- On-site staff ordering without customer data is appropriate.

Weaknesses:
- Cashier flow must be faster than paper. If it requires too many clicks, clubs will abandon it.
- Payment state must be unambiguous: unpaid, cash paid, online paid, refunded, cancelled.
- Cashier and pickup roles should be separated in permissions for larger events.

### Administrator / Board Members

Strengths:
- Admin pages exist for club, events, food items, users, modules, and payment.
- Setup wizard exists and should become the primary admin entry point.

Weaknesses:
- Admin navigation is likely too technical once modules/settings/payment providers are visible.
- “Moduleverwaltung” is a developer concept. Most clubs need “Funktionen” with simple on/off choices and explanations.
- Setup should lead with event creation, menu, ordering window, payment choice, and staff users—not architecture concepts.

## Security Review

### High severity risks

1. **JWT-only session model appears insufficient for public release.** Bearer tokens are verified, but there is no obvious refresh-token rotation, logout invalidation, device/session list, or emergency revocation. Deactivated users are checked when `loadUser` runs, but all protected routes must consistently use it.
2. **Public order access privacy.** Customers may access status pages by order identifiers. If URLs are guessable, an attacker could enumerate orders or infer personal data.
3. **Uploads.** Static file serving from an uploads directory needs strict MIME validation, size limits, filename randomization, image re-encoding, path traversal defense, and no executable content serving.
4. **Default credentials.** The README documents `admin@verein.local / admin123` and `staff123`. That is fine for demos, but dangerous if not force-rotated in production.
5. **Module trust boundary.** Official modules shipped in Docker are acceptable. Community plugins are not ready without signing, sandboxing, dependency review, migration review, and permission isolation.

### Medium severity risks

- CSRF is less relevant for Authorization-header APIs, but if any cookie-based auth is introduced, CSRF must be explicit.
- CORS must be exact in production; wildcard or misconfigured origins would expose admin APIs.
- Raw SQL module migrations need a review gate and rollback policy.
- Secrets encryption depends on operator-managed keys; key rotation and backup restoration procedures must be documented.
- GDPR support needs clearer retention, export, and deletion workflows for customer personal data.

### OWASP Top 10 observations

- Broken Access Control: permission system exists, but every admin/module route needs coverage tests.
- Cryptographic Failures: encryption exists for settings, but key lifecycle is unclear.
- Injection: Prisma helps for core queries; raw module SQL and any raw queries need strict review.
- Insecure Design: public status/order lookup and module lifecycle are design-sensitive.
- Security Misconfiguration: Docker defaults, demo credentials, CORS, and env templates need production hardening.
- Vulnerable Components: npm audit and dependency review exist, which is good.
- Identification/Auth Failures: session revocation and password policy need work.
- Logging/Monitoring: audit logs exist for platform events, but security event logging should be broader.

## Performance Review

The platform should handle typical small and medium club events. The 1000+ simultaneous user target is not proven by architecture alone.

Concerns:
- Socket.IO needs Redis adapter or equivalent for multi-instance scaling.
- PostgreSQL indexes exist for common order queries, but kitchen dashboards often need highly optimized “active orders by event/status” queries.
- Frontend bundle size and Material UI cost should be measured on old tablets and cheap Android devices.
- Polling or aggressive WebSocket broadcasts could overload event-day Wi-Fi.
- Docker single-node deployment is fine, but memory limits and health checks should be documented.

Recommendations:
- Add k6 or Artillery load tests for order creation, kitchen updates, pickup board updates, and 1000 status subscribers.
- Add query plans for dashboard and kitchen endpoints.
- Add frontend performance budgets.
- Add degraded-mode behavior when WebSocket disconnects.

## Module System Review

The module system is internally thoughtful but too heavy for v1. It can probably support 10 official modules. It will not comfortably support 100 modules without stricter boundaries, SDK versioning, compatibility tests, manifest validation, route unmounting, dependency conflict resolution, and UI grouping/search.

Specific issues:
- Relative imports make modules tightly coupled to core internals.
- Route unmounting is documented as open, so disabled modules still leave guarded routes behind.
- `activate/deactivate` and `enable/disable` naming duplication should be removed.
- Stub modules should not appear in production discovery unless explicitly marked experimental.
- Module settings should be shielded from normal admins unless necessary.

## Data Model Review

The core schema is simple and mostly appropriate: roles, users, events, food items, customers, orders, order items, status history, club settings, installed modules, migrations, and audit log.

Concerns:
- Customer data is duplicated by customer records without a visible retention/deletion workflow.
- Role model has only ADMIN and STAFF; real events may need kitchen-only, cashier-only, pickup-only, read-only board member, and event manager roles.
- Order status is a linear enum. Payment, refund, kitchen preparation, and pickup may need separate state machines to avoid impossible combinations.
- ClubSettings is a single wide row that mixes club identity, order settings, and legacy SMTP. That should be split logically or at least hidden behind separate settings pages.
- Module settings in JSON are flexible but harder to validate, query, migrate, and audit.

## API Review

The API appears conventional REST with `/api`, admin routes, module routes, and Socket.IO for realtime updates. OpenAPI support exists, which is good.

Weaknesses:
- API versioning is not apparent. Public release should either commit to `/api/v1` or document no stability guarantee before 1.0.
- Error response shape must be consistent across core and modules.
- Module routes under `/api/modules/features/{moduleId}` are technically tidy but not necessarily public API friendly.
- Admin APIs require exhaustive authorization tests.

## DevOps and Deployment Review

Strengths:
- Docker Compose is the correct operator model.
- GitHub Actions cover QA, Docker publishing, dependency review, nightly, and release validation.
- CI includes unit, integration, module scenarios, E2E, performance baseline, and security audit scripts.

Release blockers:
- Stop using `prisma db push` as the production startup story. Use `prisma migrate deploy` with backups and documented rollback.
- Add a real backup and restore runbook, not just a backup script.
- Add production `.env.example` with strong secret guidance.
- Add container health checks, resource recommendations, and upgrade instructions for non-technical admins.
- Release validation currently says it delegates, but still duplicates selected gates. Make the release gate a clear required workflow.

## QA Review

The testing investment is good. The missing part is evidence quality:

- Define coverage thresholds.
- Add mutation or negative authorization tests for high-risk endpoints.
- Add accessibility tests for elderly users and volunteers.
- Add mobile/tablet visual regression tests for kitchen and cashier flows.
- Add chaos/reconnect tests for WebSocket drops.
- Add backup/restore tests.
- Add migration rollback rehearsal.

## Open Source Review

Good:
- README is rich and screenshot-heavy.
- Developer, admin, user, architecture, and module docs exist.
- Contributing guide and license exist.
- CI is visible and serious.

Missing before broader release:
- `SECURITY.md` with vulnerability reporting.
- Issue templates for bug, feature, support, security-sensitive report.
- Release notes template and support policy.
- Public roadmap that distinguishes stable features from planned stubs.
- “Production checklist for clubs.”
- “I am a volunteer, how do I run this?” guide with minimal jargon.

## Risk Analysis

| Risk | Severity | Impact | Recommendation | Effort |
|---|---|---|---|---|
| Production schema changes via `db push` | High | Data loss or broken upgrades | Use migrations, backup-first upgrades, rollback docs | Medium |
| JWT/session revocation gaps | High | Former users retain access until expiry | Add refresh/session table, revocation, forced logout | Medium |
| Public order URL enumeration | High | Privacy breach | Add random lookup token separate from order ID | Low/Medium |
| Upload hardening incomplete | High | XSS/malware/path issues | Strict image pipeline and static headers | Medium |
| Admin UX exposes platform complexity | High | Clubs misconfigure system | Replace module jargon with guided presets | Medium |
| Module/core coupling | Medium | Plugin future blocked | Formal SDK boundary, remove relative imports | High |
| No route unmounting | Medium | Disabled modules still have route surface | Implement true unmount or isolated router rebuild | Medium |
| Duplicate module naming APIs | Medium | Developer confusion and bugs | Standardize enable/disable or activate/deactivate | Low |
| Role model too coarse | Medium | Overprivileged volunteers | Add operational roles and permission presets | Medium |
| Payment state mixed with order state | Medium | Accounting/refund errors | Separate order, payment, refund state machines | Medium |
| Weak production docs | Medium | Support burden and unsafe installs | Add operator checklist and recovery guide | Low |
| No proven 1000-user test | Medium | Event-day outage | Add load tests and WebSocket fanout tests | Medium |
| Generic settings forms | Medium | Misconfiguration | Prefer curated admin pages for common tasks | Medium |
| Placeholder modules | Low/Medium | Misleading maturity signal | Hide or remove from production docs/UI | Low |
| No API versioning | Low/Medium | Breaking integrations later | Adopt `/api/v1` or pre-1.0 disclaimer | Medium |
| Limited accessibility evidence | Medium | Elderly/volunteer usability failures | Add a11y checks and contrast/touch audits | Low |
| Secrets key lifecycle unclear | Medium | Backup restore failures or secret loss | Document key backup/rotation | Low |
| CI release gate complexity | Low/Medium | False confidence | Consolidate required checks and artifacts | Low |
| ClubSettings wide table | Low | Harder evolution | Split settings domains over time | Medium |
| No marketplace trust model | Low now, High later | Unsafe plugins | Do not enable third-party plugins yet | High |

## Top 20 Improvements Sorted by Impact

1. Replace production `prisma db push` with controlled migrations and documented backup/restore.
2. Add secure session management: refresh tokens, revocation, forced logout, session list.
3. Add non-guessable public order status tokens.
4. Harden uploads with MIME validation, image re-encoding, size limits, safe filenames, and restrictive static headers.
5. Simplify admin UX into guided setup and plain-language feature toggles.
6. Hide or remove placeholder modules from production UI and README.
7. Standardize module lifecycle terminology and remove duplicate enable/activate concepts.
8. Implement true route unmounting or router isolation for disabled modules.
9. Add role presets: admin, event manager, kitchen, cashier, pickup, read-only.
10. Separate order status from payment/refund status.
11. Add production security checklist and `SECURITY.md`.
12. Add backup restore tests in CI/nightly.
13. Add load testing for 1000 concurrent status subscribers and order bursts.
14. Add WebSocket reconnect/degraded-mode UX.
15. Add authorization negative tests for every admin and module route.
16. Add accessibility and old-tablet performance testing.
17. Formalize API versioning before integrations appear.
18. Define a real module SDK boundary before claiming future plugin support.
19. Add release notes, support policy, and upgrade guide.
20. Add operator-facing observability: health page, logs guide, database size, backup age.

## Things I Would Redesign Completely

- The public-facing module administration experience. Internally keep modules; externally show “features” and setup presets.
- The production migration/deployment story. `db push` must not be the release mechanism.
- Authentication/session lifecycle. JWT bearer auth alone is not enough for admin software used by rotating volunteers.
- Order lookup privacy. Public status should use a random token, not a predictable identifier.
- The future plugin claim. Either make a real SDK/trust model or explicitly limit v1 to built-in official modules.
- Settings UX. Schema-driven settings are fine internally, but common settings need curated pages and copy.

## Things I Would Keep Exactly as They Are

- Modular monolith rather than microservices.
- Single-tenant per club as the default deployment model.
- No customer registration requirement.
- Docker Compose as the main operations path.
- Touch-first kitchen and pickup concepts.
- Screenshots in documentation.
- ADR culture and explicit architecture documentation.
- CI investment with unit, integration, E2E, module scenarios, security, and performance scripts.
- PostgreSQL as the database.

## Final Recommendation

Do not release this as a stable public 1.0 today. Release it as a public beta or release candidate only if the README clearly says it is not yet hardened for unsupervised production use.

A stable public release should require:

1. Controlled migrations instead of production `db push`.
2. Session revocation and stronger auth lifecycle.
3. Non-guessable order status access.
4. Upload hardening.
5. Simplified admin setup that hides module/platform complexity.
6. Backup/restore documentation and test coverage.
7. Security policy and production checklist.
8. Load/reconnect testing for realistic event-day failure modes.

The product is worth continuing. The foundation is stronger than many early open-source projects. But the current architecture is trying to become a platform before the event-day user experience and production safety story are fully boring. For this audience, boring is good. Volunteers do not want a platform. They want the food orders to work.
