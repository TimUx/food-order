# Changelog

Alle wesentlichen Aenderungen an **FestSchmiede** werden hier dokumentiert.
Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/).

## 2.4.47 - 2026-07-15

### Hinzugefügt

- **Admin-Benachrichtigungen:** Mandanten-Admins können per Opt-in E-Mail-Infos zu neuen Bestellungen, Stornierungen und weiteren Ereignissen erhalten — im eigenen Profil oder zentral in der Team-Verwaltung.

### Geändert

- **Admin-Bereich:** Speisen, Gerichte und Menü heißen durchgängig „Speisen & Getränke“; Katalogeinträge sind neutral formuliert (nicht nur „Gerichte“ oder Essen).

---

## 2.4.46 - 2026-07-15

### Behoben

- **Veranstaltungsauswahl:** Icon, Titel und Datum werden im Event-Button horizontal und vertikal zentriert dargestellt.

---

## 2.4.45 - 2026-07-15

### Behoben

- **Mobile Bestellseite:** Kompakter Kopfbereich, Gerichte im 2-Spalten-Grid, fixierter „Weiter“-Footer am unteren Bildschirmrand.
- **Mobile Veranstaltungsauswahl:** Quadratische Event-Karten mit kalender-Icon ohne übermäßigen Abstand nach oben.

---

## 2.4.44 - 2026-07-15

### Hinzugefügt

- **Mandanten-Branding:** Primärfarbe unter Admin → Veranstalter → Branding — 24 vordefinierte Farben (8 Farbfamilien × 3 Helligkeitsstufen) mit gutem Kontrast für helle Schrift auf Buttons, Links und Header.
- **Öffentliches Logo:** Vereinslogo im Kopfbereich der Bestellseite (statt FestSchmiede-Logo, nur wenn hochgeladen) und auf der Kontaktseite.

### Behoben

- **Öffentliches Logo:** Tenant-Daten werden mit Club-Einstellungen zusammengeführt, damit hochgeladene Logos auf öffentlichen Seiten zuverlässig erscheinen.

---

## 2.4.42 - 2026-07-15

### Behoben

- **CI Nutzerreise:** Dashboard-Schritt pollt die Bestellungen-Kachel statt auf eine bereits verpasste Stats-API-Response zu warten.

---

## 2.4.41 - 2026-07-15

### Behoben

- **CI Nutzerreise:** Dashboard-Schritt wartet auf Stats-API und prüft die Bestellungen-Kachel statt fragiler Ziffern-Suche im gesamten DOM.

---

## 2.4.40 - 2026-07-15

### Behoben

- **Mitarbeiter Veranstaltungsauswahl:** Bei mehreren Events am selben Tag wird bevorzugt die einzige aktive Veranstaltung vorausgewählt (statt alphabetisch erste/inaktive) — Kasse und Bestellübersicht zeigen wieder Gerichte und Bestellungen.
- **CI Nutzerreise:** E2E-Tests wählen die aktive Veranstaltung explizit im Header-Dropdown (Anpassung an zentrale Event-Auswahl aus v2.4.39).

---

## 2.4.39 - 2026-07-14

### Behoben

- **Mitarbeiter Bestellungen:** Dashboard, Bestellungen und Küche nutzen die explizit gewählte Veranstaltung statt einer automatisch ermittelten „aktiven“ Veranstaltung — bei mehreren Events werden Bestellungen wieder korrekt angezeigt.

### Geändert

- **Mitarbeiterbereich:** Zentrale Veranstaltungsauswahl im Kopfbereich (Header/Mobile), tenant-spezifisch gespeichert und für alle Subseiten gültig (Dashboard, Bestellungen, Küche, Abholung, Kasse, Verfügbarkeit).
- **Kasse & Abholung:** Hinweis, wenn die gewählte Veranstaltung dort nicht aktiv ist (Kasse deaktiviert, Bestellungen geschlossen o. ä.).

---

## 2.4.38 - 2026-07-14

### Behoben

- **Team / Passwort:** Benutzer-Passwort im Mandanten-Admin ließ sich nicht ändern (500 durch `updateMany` mit Rollen-Relation).
- **Mitarbeiter-Berechtigungen:** Effektive Rechte werden aus Rollenvorlagen abgeleitet — Mitarbeiter mit Abholung/Kasse/Finanzen sehen wieder Dashboard und Bestellungen; Navigation nur bei passenden Berechtigungen.
- **Bestellstatus-Link in E-Mails:** Status-URLs nutzen `lookupToken` statt interner UUID; ältere Links mit UUID funktionieren weiterhin.
- **Drucken (Bestellungen):** Druckvorschau über verstecktes iframe statt Popup — kein leeres Fenster mehr bei blockierten Popups.
- **Admin Funktionen:** Irreführender „Aktualisierung verfügbar“-Hinweis bei nicht installierten Modulen entfernt; manuelles Modul-Upgrade deaktiviert (Updates nur mit Plattform-Releases).

---

## 2.4.37 - 2026-07-14

### Hinzugefügt

- **Öffentliche Bestellseite:** Hinweisseite statt leerem Formular, wenn keine buchbare Veranstaltung existiert oder die Speisekarte leer ist (`PublicNoEventsNotice`).

### Behoben

- **Bild-Upload (Speisen/Logo):** Mandanten-Kontext geht bei Multipart-Uploads (Multer) nicht mehr verloren — Uploads schlagen nicht mehr mit „Kein Veranstalter-Kontext“ fehl.
- **Admin Speisen:** Klarere Katalog-Verwaltung unabhängig von Veranstaltungen; verbesserter Ladezustand und Leeranzeige.
- **Mitarbeiter Verfügbarkeit:** Veranstaltungsauswahl statt Abhängigkeit von einer einzelnen aktiven Veranstaltung (`/service/speisen`).

---

## 2.4.36 - 2026-07-14

### Hinzugefügt

- **E2E-Nutzerreise:** Playwright-Test von Mandantenbewerbung über Einrichtung, Veranstaltungen, Gerichte, Online-/Kassenbestellungen, Küche, Abholung und Admin-Dashboard bis zur DSGVO-Mandanten-Löschung.
- **DSGVO-Mandanten-Löschung:** `TenantPurgeService` entfernt Zahlungsdaten, Audit-Logs, Bewerbungen, DB-Cascade und Upload-Dateien vollständig.
- **Veranstaltungen löschen:** `DELETE /staff/events/:id` mit UI-Button (409 bei vorhandenen Bestellungen).
- **CI:** Eigener Workflow-Job für die realistische Nutzerreise; Nightly und Release-Validation fokussiert auf Lasttest + Journey; Docker-Images werden nur noch über Release Validation veröffentlicht.

### Behoben

- **Bestellungen/Payment:** Fehlertolerante Payment-Abfragen und `isAvailable()` ohne 500 bei fehlender `payments`-Tabelle.
- **Speisen löschen:** 409 statt 500 wenn Bestellungen referenzieren.
- **DSGVO-Mandanten-Löschung:** Robuster Purge (Payment-Schema-Teilmigration, explizite FK-Löschungen, Upload-Verzeichnis).
- **Tenant-Routing:** Nach Mandanten-Löschung `scope: unknown` und „Veranstalter nicht gefunden“; Resolver-Cache wird invalidiert; WWW-Routen (`/mandant-beantragen` usw.) werden nicht als Slugs gewertet.
- **E2E-Nutzerreise:** Abholung leert Nachname-Feld zwischen Online- und Kassen-Abholung; Plattform-Löschung mit Dialog- und API-Wartezeit.
- **Installer:** `IMAGE_TAG` aus Shell überschreibt `.env`; sichererer Swarm-Deploy und Rollback ohne aggressives `stack rm`.
- **Admin-UI:** Sponsor-Links aus Admin-Navigation entfernt.

### Geändert

- **Plattform:** Klarer DSGVO-Hinweis beim Mandanten-Löschen.
- **QA:** Smoke-E2E und Nutzerreise getrennt (`qa:e2e` / `qa:e2e:journey`).
- **CI:** Separater Workflow `docker-publish.yml` entfernt — Image-Build nur noch in `release-validation.yml`.

---

## 2.4.35 - 2026-07-14

### Behoben

- **CI/Release:** ESLint-, TypeScript- und E2E-Fehler aus v2.4.34 behoben (Quality Assurance und Release Validation laufen wieder grün).
- **Build:** `smtpResolver`, `ModuleManager` und `StaffEventSelect` TypeScript-kompatibel.
- **E2E:** Smoke-Test für zweistufige Online-Bestellung aktualisiert.

---

## 2.4.34 - 2026-07-14

### Geändert

- **Online-Bestellung:** Zweistufiger Ablauf (Gerichte → Kundendaten); kompaktere Touch-Oberfläche.
- **Bestellung vor Ort & Abholung:** Veranstaltungs-Dropdown mit korrekt positioniertem Label (`StaffEventSelect`).
- **Zahlung:** Standard „Bar vor Ort“, wenn Payment-Modul nicht freigeschaltet oder nicht aktiviert.
- **Sponsor-Links:** Nur noch im Mandanten-Admin, nicht mehr im öffentlichen und Mitarbeiterbereich.

### Behoben

- **Bestellliste:** Interner Serverfehler beim Laden (fehlertolerante Payment-Abfragen; Realtime-Auth für Event-Sync).
- **Dashboard vs. Bestellungen:** Statistiken funktionieren unabhängig vom Payment-Modul.
- **Öffentliche Bestellung / Kasse:** Bestellungen und Küchenfreigabe auch ohne Payment-Tabelle.
- **Admin Funktionen:** Legal-Modul-Aktivierung und Benachrichtigungs-SMTP ohne Absturz bei fehlender Konfiguration.
- **Modul-Verwaltung:** Upgrade/Aktivierung robuster; fehlgeschlagene Aktivierungen werden zurückgesetzt.
- **Abholung:** Lookup für Vor-Ort-Bestellungen ohne strikte Pickup-Event-Prüfung.
- **Datenbank:** Klarere Meldung bei veraltetem Schema (fehlende Migrationen).

---

## 2.4.33 - 2026-07-13

### Hinzugefügt

- **Mehrere Veranstaltungen:** Jede Veranstaltung hat einen Schalter **Veranstaltung aktiv** — mehrere können gleichzeitig aktiv sein.
- **Speisen-Katalog:** Mandantenweiter Katalog unter **Speisen**; Zuordnung je Veranstaltung über **Veranstaltungen → Speisen**.
- **Online-Bestellung:** Bei mehreren buchbaren Veranstaltungen Auswahl per Touch-Grid vor der Speisekarte.
- **Bestellung vor Ort & Abholung:** Veranstaltungs-Dropdown mit Vorauswahl nach heutigem Veranstaltungsdatum.
- **Bestellstatus-Abfrage:** Veranstaltungsauswahl bei mehreren aktiven Events (`eventId` bei `/public/orders/lookup`).
- **Abholboard:** Veranstaltungsauswahl bei mehreren Events; Monitor zeigt nur Nummern der gewählten Veranstaltung.
- **Küchenfreigabe:** Online-Bestellungen können in der Bestellliste zur Küche freigegeben werden; Vor-Ort sofort freigegeben.
- **Sponsor-Links:** Buy Me a Coffee / PayPal prominent auf öffentlichen Seiten, Marketing-Website, Mitarbeiter- und Admin-Bereich.
- **Benachrichtigungen:** E-Mail bei fehlgeschlagener Online-Zahlung (`paymentFailed`); SMTP-Verbindungstest robuster.
- **Rechtliches Modul:** Aktivierung über registrierten Settings-Namespace `module.legal`.
- **Öffentliche APIs:** `GET /public/events`, `GET /public/events/pickup`, `GET /staff/events/cashier`, `GET /staff/events/pickup`; `eventId` bei Menü, Bestellung, Lookup und Abholboard.
- **Dokumentation:** Guides und Screenshots aktualisiert; CI Dependency-Review nur noch für PRs.

### Geändert

- **Veranstaltungen:** Button „Aktivieren“ entfällt — Aktivierung nur noch über den Schalter im Bearbeitungsdialog.
- **Speisen:** „Ausverkauft“ gilt pro Veranstaltung (Staff **Verfügbarkeit**), nicht mehr im Katalog.
- **Mitarbeiterbereich:** Dashboard und Bestellliste laden Daten initial per API; alle Bestellungen sichtbar mit Zahlungsstatus-Label.
- **Küche:** Zeigt nur für die Küche freigegebene Bestellungen (`released_to_kitchen`).
- **Öffentlicher Bestellstatus:** Gerichte-Zusammenfassung; Touch-freundlicher Status-Link im Header.

### Behoben

- **Dashboard / Bestellliste:** Statistiken und Bestellungen wurden nicht angezeigt (fehlerhafte SQL-Spalten in `orderStats`, fehlender Initial-Load).
- **Veranstaltung bearbeiten:** Interner Serverfehler beim Speichern (ungültiges Feld `activateOnCreate` an Prisma).
- **Logo-Upload:** Vereinslogo wird nach Upload in öffentlichen Mandantendaten angezeigt.
- **Benachrichtigungen:** Modul-Status „Deaktiviert“ / SMTP-Test 500 bei fehlender `smtp.from`-Konfiguration.
- **Bestellseite:** „Keine Bestellungen möglich“ nach zweiter Veranstaltung ohne Speisen-Zuordnung.
- **Willkommens-Mail:** Links und Tipps für die erste Veranstaltung nach Ersteinrichtung.

### Datenbank

- Migration `20260713230000_event_food_assignments` (mandantenweiter FoodItem-Katalog, `EventFoodItem`)
- Migration `20260713220000_order_release_to_kitchen` (`Order.released_to_kitchen`)

---

## 2.4.31 - 2026-07-13

### Hinzugefügt

- **Kassenbereich:** Hub mit großen Buttons (Abholung, Bestellung, Mitarbeiterbereich) und „Übersicht“-Link im Fokusmodus.
- **Team:** Mehrere Rollenvorlagen pro Mitarbeiter (Checkbox-Auswahl), Berechtigungen werden zusammengeführt.

### Geändert

- **Abholung:** Nachname optional bei Vor-Ort-Bestellungen; Suche nur mit Abholnummer möglich.
- **Realtime:** Polling-Fallback ohne dauerhaften Warnhinweis; Warnung nur bei Offline/Reconnect/Degradierung.

### Behoben

- **Kassenmodus:** Vor-Ort-Bestellungen erscheinen in Küche und Bestellliste; Abholung per Nummer ohne Kundennamen.
- **Team:** „Rolle nicht gefunden“ beim Anlegen von Mitarbeitern (STAFF-Rolle wird automatisch angelegt).
- **Admin Funktionen:** Endlosschleife/Flackern auf der Modul-Seite behoben.
- **Mitarbeiterbereich:** WebSocket-Verbindung bei pfadbasiertem Mandanten-Routing (Mandanten-Slug wird mitgegeben).

---

## 2.4.27 - 2026-07-13

### Behoben

- **Mandanten-Onboarding:** ADMIN- und STAFF-Rollen werden beim Genehmigen automatisch angelegt, wenn sie in der Datenbank noch fehlen (z. B. ohne `prisma db seed`).

---

## 2.4.26 - 2026-07-13

### Behoben

- **CI:** Migrations-Test robuster (deploy + status in einer Session, Retry und klarere Fehlerausgabe).

---

## 2.4.25 - 2026-07-13

### Hinzugefügt

- **Landingpage:** Hero-Logo doppelt so groß, Überschrift in einer Zeile daneben.
- **Landingpage:** „Über das Projekt“ und „Über den Entwickler“ direkt im Header; „Anmelden“ nur noch im Menü.
- **Mandantenantrag:** Feldvalidierung mit Zeichenzählern, konkreten Fehlermeldungen und Scroll zum ersten Fehler.
- **Mandantenantrag:** Bot-Schutz (Honeypot, Mindest-Ausfüllzeit, Cloudflare Turnstile wie bei Bestellungen).
- **Mandantenantrag:** Rate-Limit-Hinweis mit Uhrzeit für den nächsten Versuch.

### Geändert

- **Landingpage:** Header-Links rechtsbündig ausgerichtet.
- **Mandantenantrag:** Rate-Limit von 5/Stunde auf **5 pro 30 Minuten** reduziert.
- **Mandantenantrag:** Website und Internetadresse werden vor Validierung normalisiert (`https://`, Kleinbuchstaben).

### Behoben

- **Mandantenantrag:** Validierungsfehler zeigen betroffenes Feld und Grund statt nur „Validierungsfehler“.

---

## 2.4.24 - 2026-07-13

### Behoben

- **CI:** ESLint-Warnung (ungenutzte Variable) in `platformNotificationService` behoben.
- **CI:** Unit-Tests für Mandanten-Onboarding und -Anträge an `ensureAdministrator`-Mock angepasst.
- **CI:** E2E-Test der Landingpage an Burger-Menü-Navigation angepasst.

---

## 2.4.23 - 2026-07-13

### Hinzugefügt

- **Landingpage:** Übersichtlichere Navigation mit Burger-Menü; „Start“ und „Mandant beantragen“ bleiben direkt sichtbar.
- **Mandantenantrag:** Hinweis-Symbole mit Beispieltexten zu den Begründungsfeldern im Bewerbungsformular.

### Geändert

- **Branding:** Logo in Header, Menü und Footer vergrößert (einheitliche Größen-Presets).
- **Mandantenantrag:** Begriff „Slug“ in der Oberfläche durch „Internetadresse“ ersetzt.

### Behoben

- **Mandanten-Onboarding:** Administrator wird beim Genehmigen, Aktivieren und Verknüpfen zuverlässig angelegt – unabhängig vom E-Mail-Versand.
- **Mandanten-Onboarding:** Erneutes Genehmigen bei bestehender Verknüpfung führt Onboarding erneut aus (Bug in v2.4.22).
- **Plattform:** „Infos senden“ und „Als Admin anmelden“ funktionieren auch wenn zuvor kein Admin existierte; klare Fehlermeldungen bei SMTP-Problemen.

---

## 2.4.22 - 2026-07-13

### Hinzugefügt

- **Mandantenanträge:** Bewerbungen endgültig löschen (zusätzlich zu Archivieren).
- **Mandantenanträge:** Verknüpfung mit bestehendem Mandant erstellen, ändern und aufheben.
- **Mandantenanträge:** Erneutes Genehmigen mit automatischer Mandanten-Anlage, wenn keine Verknüpfung besteht.

### Behoben

- **Mandantenverwaltung:** Beim Löschen eines Mandanten wird die Verknüpfung im zugehörigen Antrag entfernt.

---

## 2.4.21 - 2026-07-13

### Behoben

- **CI:** TypeScript-Fehler in `TenantOnboardingService` (`revokeAllUserSessions` statt falscher Methodenname).

---

## 2.4.20 - 2026-07-13

### Behoben

- **CI:** Tenant-Prisma-Guard-Allowlist um `TenantOnboardingService` ergänzt (QA und Release Validation für v2.4.19).

---

## 2.4.19 - 2026-07-13

### Hinzugefügt

- **Mandanten-Onboarding:** Zugangs-Mail nach Genehmigung oder manueller Erstellung mit Admin-Zugangsdaten, Links und temporärem Passwort.
- **Plattform-Admin:** Button „Infos senden“ auf der Mandanten-Detailseite zum erneuten Versand der Zugangsdaten.

### Behoben

- **Impersonation:** „Als Admin anmelden“ speichert den Token korrekt (scoped Storage) und zeigt Fehler an.

---

## 2.4.18 - 2026-07-13

### Hinzugefügt

- **Marketing:** Ausführliche Seite „Über den Entwickler“ mit Beruf, Ehrenamt, Motivation und Open-Source-Projekten (timobraun.de, GitHub @TimUx).

---

## 2.4.17 - 2026-07-13

### Hinzugefügt

- **Branding:** FestSchmiede-Logo in Header, Landingpage, Plattform-Login, Admin und als Favicon/PWA-Icon.
- **Landingpage:** Abschnitt „So läuft der Bestellprozess“ mit Ablaufdiagramm und Screenshots (Bestellen → Küche → Abholbereit → Abholung).
- **Navigation:** Link „Bestellprozess“ auf der Marketing-Website.

---

## 2.4.16 - 2026-07-13

### Hinzugefügt

- **Plattform-Admin:** Dark-Mode-Toggle in der App-Bar (wie Mandanten-Admin und öffentliche Website).

### Behoben

- **Marketing-Website:** Hero, CTA-Band und Footer nutzen theme-abhängige Hintergründe — im Dark Mode keine hellen Flächen mit heller Schrift mehr.

---

## 2.4.15 - 2026-07-12

### Behoben

- **Installer Reparatur:** Health-Check fällt auf interne Prüfung zurück, wenn HTTPS über die Domain vom Server selbst nicht erreichbar ist (NAT/Hairpin).

---

## 2.4.14 - 2026-07-12

### Behoben

- **DB-Restore:** `DROP`/`CREATE DATABASE` wird per `psql -c` ausgeführt (`docker exec` ohne `-i` ignorierte zuvor Heredoc-stdin).

---

## 2.4.13 - 2026-07-12

### Behoben

- **DB-Restore:** Leert die Zieldatenbank vor dem Import (`DROP`/`CREATE`), damit pg_dump-Backups nicht an bereits vorhandenen Typen scheitern.

---

## 2.4.12 - 2026-07-12

### Behoben

- **DB-Restore (Swarm):** `postgres-restore.sh` erkennt Postgres-Tasks wie das Backup-Skript; stoppt App-Services vor dem Restore.
- **Installer-Update:** Migrations-Wartezeit prüft nur noch `database.ok` (nicht den gesamten Health-Status).
- **Rollback:** Restore beendet aktive DB-Verbindungen und wartet auf Postgres.

---

## 2.4.11 - 2026-07-12

### Behoben

- **Installer-Update (Swarm):** Health-Check wartet zuerst auf Backend-Container und prüft `/api/health` direkt im Task (nicht nur über Frontend).
- **Installer-Update:** Fortschrittsmeldungen während der Migrations-Wartezeit (alle 30s).

---

## 2.4.10 - 2026-07-12

### Behoben

- **Installer-Update:** `--update` lädt veraltete Installer-Dateien automatisch nach (auch im „lokalen“ Modus ohne Git).
- **Installer:** Fallback für sicheres `.env`-Parsing, wenn `scripts/lib/dotenv.sh` noch fehlt.
- **Datenbank-Backup:** `postgres-backup.sh` parst `.env` ohne `source` (Backticks in `TRAEFIK_ROUTER_RULE`).

---

## 2.4.9 - 2026-07-12

### Behoben

- **CI / QA:** Login-API akzeptiert wieder `email` als Alias für `identifier` (Rückwärtskompatibilität für Tests und bestehende Clients).
- **CI / QA:** Seeds setzen `passwordEnabled` explizit; E2E-Tests nutzen das neue Login-Feld-Label.
- **CI / QA:** ESLint-Warnung in `platformAuthService.ts` behoben.

---

## 2.4.8 - 2026-07-12

### Hinzugefügt

- **Benutzer-Identität:** Eindeutige Benutzernamen für Mitarbeiter (Login mit Benutzername oder E-Mail).
- **Anmeldemethoden pro User:** Magic Link und/oder Passwort wählbar; Standard für neue Admins ist Magic Link.
- **Mandanten-Admin-Profil:** Eigenes Profil unter `/admin/profil` (Name, E-Mail, Benutzername, Anmeldemethoden).
- **Passwort vergessen:** Reset-Flow per E-Mail für Mandanten- und Plattform-Login (wenn Passwort-Anmeldung aktiv).
- **Plattform-Login:** Magic Link und Passwort-vergessen für Plattformadministratoren.

### Geändert

- **Mitarbeiter:** E-Mail optional; Benutzername Pflicht; Passwort/PIN ab 4 Zeichen; kein eigenes Profil.
- **Team-Verwaltung:** Formulare für Benutzername, optionale E-Mail und Anmeldemethoden (Mandant + Plattform).
- **Installer:** Sicheres Laden der `.env` (Traefik-Regeln mit Backticks); Swarm-Postgres-Container-Erkennung beim Backup.

### Behoben

- **Plattform-Backups:** `pg_dump`-Verfügbarkeitscheck auf Alpine (Busybox-`gunzip` unterstützt kein `--version`).
- **Installer-Update:** Datenbank-Backup schlug fehl, wenn `TRAEFIK_ROUTER_RULE` unquoted in `.env` stand.

---

## 2.4.7 - 2026-07-12

### Hinzugefügt

- **Plattform → Rechtliches:** Mustertexte für Impressum, Datenschutz und Nutzungsbedingungen (automatisch vorausgefüllt, Button „Beispieltext laden“).
- **Plattform → Backups:** Vollbackup und Mandanten-Backup inkl. Restore, Validierung und Download über die Plattform-UI (`/app/backups`-Volume).
- **Plattform → Profil:** Eigenes Profil unter `/platform/profil` (Name, E-Mail, Passwort).
- **Plattform → Benutzer:** Administratoren anlegen und bearbeiten (inkl. Passwort-Reset und Aktiv/Inaktiv).

### Geändert

- **Dashboard:** Monitoring-Metriken integriert; separater Menüpunkt „Monitoring“ entfernt.
- **Plattformversion:** Anzeige und `CORE_VERSION` aus `package.json` statt statischem Fallback `2.0.0`.
- **Plattform-Einstellungen:** Booleans als Schalter; Mandantenbewerbungen wirken sofort nach Speichern.
- **Plattform-UI:** Pfad-basiertes Routing (keine Wildcard/Subdomain-Felder mehr); Dokumentations-Link aus GitHub-URL; SMTP-Verschlüsselung als ein Modus (STARTTLS/SSL/keine).
- **Mandanten:** Slug und Subdomain werden beim Anlegen/Aktualisieren synchron gehalten.

### Behoben

- **SMTP:** Portabhängige TLS-Konfiguration (587=STARTTLS, 465=SSL), gegenseitiger Ausschluss von SSL/STARTTLS, klarere Zertifikatsfehler.

---

## 2.4.6 - 2026-07-12

### Behoben

- **E2E/CI:** Playwright-Mandantentests nutzen relative Pfade unter `TENANT_BASE` (Trailing-Slash), damit Navigation zu `/default/…` statt fälschlich `/admin/login` auf localhost-WWW landet.
- **E2E:** Admin-Navigationstest an Volunteer-first-UI angepasst (Benachrichtigungen unter Funktionen).

---

## 2.4.5 - 2026-07-12

### Behoben

- **nginx-Proxy:** `proxy_pass` mit Variablen leitete `/api/` fehlerhaft als `/api/api/…` weiter — behoben durch statischen `upstream`-Block (`backend_service`). Behebt leere Frontend-Seiten und E2E-Timeouts in CI.
- **CI:** `docker-compose.ci.yml` setzt `BACKEND_HOST`; `wait-for-services.sh` prüft Routing-API über Frontend.

---

## 2.4.4 - 2026-07-12

### Behoben

- **CI/Tests:** Unit-Test-Fehler in `PlatformDomainService`, `TenantResolver` und `notificationTenantContext` — Release Validation kann Docker-Images bauen.

---

## 2.4.3 - 2026-07-12

### Behoben

- **CI/Release:** TypeScript-Fehler in `orderExportService`, fehlende `resolveTenantBrandingDefaults`-Funktion und MUI-Grid in `OrderEditDialog` — Quality Assurance und Release Validation (Docker-Image-Build) laufen wieder durch.
- **ESLint:** Ungenutzter Parameter in `scripts/qa/linkcheck.ts`.

---

## 2.4.2 - 2026-07-12

### Geändert

- **Container-Kommunikation:** Frontend-nginx leitet `/api/` intern über den Docker-Service-Namen `backend` weiter (`BACKEND_HOST`/`BACKEND_PORT` konfigurierbar), nicht über `localhost`.
- **Externe Erreichbarkeit:** Produktion ausschließlich über HTTPS auf `www`/`app`-Domain (Traefik → Frontend); Backend nicht von außen exponiert. API-URLs und Health-Checks nutzen `https://app.<domain>/api/…`.
- **Installer:** Strikter Health-Check in Produktion prüft die öffentliche HTTPS-Route; Migration wartet intern über Docker-Netz.

---

## 2.4.1 - 2026-07-12

### Behoben

- **Frontend-Produktions-Image:** `VITE_API_URL` und `VITE_WS_URL` standardmäßig leer (Same-Origin über nginx), nicht mehr `http://localhost:3001` — behebt „NetworkError“ / CORS auf www und app.
- **nginx:** Proxy für `/:tenant/api/` und `/:tenant/uploads/` (Pfad-Mandanten-Routing).
- **Installer:** Setzt `VITE_API_URL`/`VITE_WS_URL` in Produktion auf leer.

---

## 2.4.0 - 2026-07-12

### Geändert (Breaking)

- **Multi-Tenant-Routing:** Mandanten sind nur noch unter Pfad auf dem App-Host erreichbar (`https://app.example.de/<tenant>/…`), nicht mehr per Subdomain (`<tenant>.example.de`).
- **API:** Mandanten-APIs unter `/<tenant>/api/…` (zentraler `TenantResolver` + Pfad-Rewrite-Middleware).
- **Frontend:** Öffentliche Bestellseite unter `/<tenant>/public`; `apiBasePath` aus Routing-Konfiguration.
- **Traefik/Installer:** Nur noch zwei Router (`www` + `app`); keine `HostRegexp`, Wildcard-Zertifikate oder Mandanten-Subdomain-Fragen im Wizard.
- **URLs in E-Mails/Links:** Pfad-basiert über `app.<domain>/<slug>`.

### Neu

- `TenantPathRewriteMiddleware` für `/:tenant/api` und `/:tenant/uploads`.
- `createTenantResolverMiddleware` als Alias der zentralen Tenant-Middleware.
- Automatische DB-Migration `migratePathRoutingV20` (Pfad-Routing aktivieren, Wildcard-CORS deaktivieren).

### Vorteile

- Ein Zertifikat pro Host (www + app), kein Wildcard/DNS-Challenge.
- Einfacheres Self-Hosting mit Traefik, nginx, Caddy oder HAProxy.
- Zukünftige eigene Domains/Subdomains pro Mandant nur im `TenantResolver` änderbar.

---

## 2.3.13 - 2026-07-12

### Behoben

- **Installer (Swarm):** `$` in Secrets/ENV und Traefik-Regex werden als `$$` escaped (Stack-Deploy-Interpolation).
- **Backend:** Produktions-CORS nutzt `CORS_ORIGIN` auch dann, wenn `PLATFORM_DOMAIN` noch localhost ist (z. B. fehlende Swarm-ENV).

---

## 2.3.12 - 2026-07-12

### Neu

- **Installer:** Wizard fragt Ausrollung ab — **Docker Compose** oder **Docker Swarm** (für externen Traefik @swarm).
- **Installer:** Swarm-Modus erzeugt `stack.yml` mit `deploy.labels`, Placement auf Installations-Host (`node.id`), 1 Replica pro Service und Docker Secrets.
- **Installer:** `scripts/deploy/render-swarm-stack.sh` nutzt dieselbe Stack-Generierung wie der Assistent.

---

## 2.3.11 - 2026-07-12

### Behoben

- **Backend:** Produktions-CORS wird bei jeder Start immer aus ENV/Domain abgeleitet (nicht nur wenn DB localhost enthält); Wildcard-Origins (`https://*.domain`) werden korrekt behandelt.
- **Installer:** Schreibt `COMPOSE_FILE` in `.env`, damit `docker compose down/up` automatisch die Override-Datei lädt.

---

## 2.3.10 - 2026-07-11

### Behoben

- **Backend:** Produktions-CORS nutzt HTTPS-Origins aus `PLATFORM_DOMAIN` / `PLATFORM_ALLOWED_ORIGINS`, wenn die Datenbank noch localhost-Defaults enthält — behebt Backend-Absturz nach Installation mit externem Traefik.
- **Installer:** Leitet bei aktivem Reverse Proxy automatisch Produktions-CORS ab.

---

## 2.3.9 - 2026-07-11

### Behoben

- **Installer:** Compose-Override wird als `docker-compose.override.yml` im Installationsroot veröffentlicht (Traefik-Labels und Proxy-Netzwerk sichtbar und von `docker compose` automatisch geladen).
- **Installer:** Traefik-Proxy-Netzwerk wird auch bei neu erstelltem Netzwerk korrekt definiert; Proxy-Einstellungen werden zuverlässiger aus `.env` wiederhergestellt.

---

## 2.3.8 - 2026-07-11

### Behoben

- **Installer:** PostgreSQL-Volume-Erkennung berücksichtigt nur FestSchmiede-Volumes (`festschmiede_postgres_data`, `{projekt}_postgres_data`, Legacy `vereins_postgres_data`) — nicht fremde Volumes wie `patchmon_postgres_data`.

---

## 2.3.7 - 2026-07-11

### Behoben

- **Installer:** Erkennt vorhandenes PostgreSQL-Daten-Volume bei Neuinstallation und bietet Zugangsdaten aus Backup übernehmen oder Volume zurücksetzen an (behebt P1000-Authentifizierungsfehler).
- **Installer:** Generiert kein neues DB-Passwort, wenn vorhandene Zugangsdaten wiederverwendet werden.

### Geändert

- **Datenbank-Defaults:** `festschmiede` statt `verein` / `vereinsbestellung` (User, DB-Name, Backup-Dateinamen).
- **Compose/CI:** Fallback-Passwort `change-me-in-production` statt `verein_secret`.

---

## 2.3.6 - 2026-07-11

### Neu

- **Installer:** Bei „Vorhandenen Proxy verwenden“ Auswahl des Proxy-Typs (Traefik, nginx, Caddy, Apache, HAProxy).
- **Installer:** Traefik-Labels werden bei externem Traefik direkt in `compose.override.yml` erzeugt; für andere Proxies Konfigurationsvorlagen unter `installer/generated/proxy/`.

### Geändert

- **Installer:** Unterscheidung `PROXY_DEPLOYMENT` (bundled/external/manual) und `PROXY_MODE` (Proxy-Technologie).
- **Installer:** Proxy-Netzwerk-Schritt entfällt bei gebündeltem Traefik und Host-NGINX.

---

## 2.3.5 - 2026-07-11

### Behoben

- **Frontend Healthcheck:** `localhost` durch `127.0.0.1` ersetzt (IPv6-Verbindungsfehler in Alpine/nginx). Prüfung läuft container-intern und funktioniert auch ohne Host-Port-Mapping bei Reverse Proxy.
- **Frontend nginx:** IPv6-Listen und Laufzeit-Auflösung von `backend` über Docker-DNS — kein Start-Abbruch mehr, wenn der Backend-Hostname beim Start noch fehlt.
- **Installer Bootstrap:** Online-Installation lädt nur Plattform-Dateien (Compose, Installer, Backup-Skripte), nicht das gesamte Git-Repository.
- **Container-Namen:** Einheitlich `festschmiede-postgres`, `festschmiede-backend`, `festschmiede-frontend`.
- **Installer Health-Check:** Nutzt Docker-Container-Status statt externer HTTPS-URLs (verhindert Timeout bei Reverse Proxy).

### Geändert

- **Installer:** Healthcheck und `expose: 80` werden im Compose-Override bei Reverse Proxy explizit gesetzt.

---

## 2.3.4 - 2026-07-11

### Neu

- **Installer:** Interaktive Auswahl des Installationspfads — vor dem Download (Online-Install) und im Wizard nach dem Willkommensdialog. `/opt/festschmiede` ist nur noch ein Vorschlag, kein stilles Default ohne Abfrage.

---

## 2.3.3 - 2026-07-11

### Geändert

- **Installer:** Modul-Auswahl-Schritt entfernt (war nur Dokumentation in `.env`, ohne funktionale Wirkung). Module werden nach der Installation unter Administration → Module aktiviert.

---

## 2.3.2 - 2026-07-11

### Behoben

- **Bootstrap:** Bei erneutem `curl | bash` auf bestehende Installation werden Plattform-Dateien automatisch aktualisiert, wenn die installierte Installer-Version veraltet ist (verhindert alten Wizard mit „Docker-Netzwerk“ vor Proxy-Abfrage).

### Geändert

- **Dokumentation:** Erklärung zu internem vs. Proxy-Netzwerk und Auto-Update beim Online-Install.

---

## 2.3.1 - 2026-07-11

### Behoben

- **Installer:** „Vorhandenen Proxy verwenden“ und NGINX setzen jetzt das Produktionsprofil — Domain und HTTPS können konfiguriert werden.
- **Installer:** Proxy-Netzwerk-Schritt erscheint nur noch, wenn ein Reverse Proxy gewählt wurde; ohne Proxy lokale Host-Ports und nur internes Docker-Netz.

### Geändert

- **Installer:** HTTPS-Abfrage bei externem Proxy ohne Let's-Encrypt-Pflicht (Zertifikat am Reverse Proxy).
- **Dokumentation:** Wizard-Schritte Reverse Proxy / Proxy-Netzwerk korrigiert.

---

## 2.3.0 - 2026-07-11

### Neu

- **Bestellungen bearbeiten:** Admins und Mitarbeiter können offene Bestellungen (Neu/In Bearbeitung) anpassen — Gerichte hinzufügen, entfernen, Mengen ändern, stornieren.
- **Ausverkauft markieren:** Gerichte als ausverkauft kennzeichnen (Admin, Küche, Kasse); in der Bestellung ausgegraut mit Hinweis.
- **Bestellexport:** Druckansicht und Excel-Export (`.xlsx`, formatiert) aller Bestellungen pro Veranstaltung.
- **Plattform:** Mandanten bearbeiten (Organisation, Kontakt, technische Felder).
- **Installer:** Konfigurierbares Installationsverzeichnis, verbesserte TUI, Docker-Netzwerk-Architektur (intern + Proxy).

### Geändert

- **Dokumentation:** Reduziert auf das Wesentliche (~50 Dateien weniger); README mit Screenshots und Funktionsüberblick erweitert.
- **Developer Guide:** Node 20, `prisma generate` nach Docker-Builds.

### Abhängigkeiten

- Backend: `exceljs` für XLSX-Export.

---

## 2.2.3 - 2026-07-10

### Behoben

- **CI/QA vollständig grün:** Docker-Stack, Migrationen, API-Tests, E2E, Performance-Baseline und Release-Validation.
- **Multi-Tenant CI:** Mandanten-Routing über `default.localhost`, Plattform-Marketing auf `localhost`, API same-origin via Nginx.
- **E2E:** Admin-Drawer-Locators, Nginx `/screenshots`-SPA-Route, lokale Canonical-URLs mit Port.
- **API/Routing:** Resolver-Cache, `platform`-Slug, Supertest-Host-Helper, Tenant-Prisma-Guard, QA-Seed.
- **Lint/TypeScript:** Korrekturen nach v2.2.2-Merge.

---

## 2.2.2 - 2026-07-10

### Neu

- **Tenant Guardrails:** CI blockiert ungescopte `prisma.<tenantModel>`-Zugriffe (ADR 040).
- **Tenant Role Templates:** Vorlagen Küche, Abholung, Kasse, Speisenpflege, Finanzen, Rechtliches (ADR 043).
- **Core Permissions:** `team.manage`, `food.edit`, `orders.kitchen`, `settings.club` u. a.
- **Geführte Betriebsabläufe:** `./install.sh --update`, `--repair`, `--backup`, `--validate` (ADR 044).
- **Restore Dry-Run:** `DRY_RUN=1` für Backup-Integritätsprüfung.

### Geändert

- **Produktionsmigrationen:** `prisma migrate deploy` statt `db push` (ADR 039).
- **Module API v3:** Kanonische Runtime in `platform/` (ADR 041).
- **Volunteer-first Admin:** Dashboard/Navigation fokussiert Alltagsaufgaben (ADR 042).
- Team-UI mit Rollenvorlagen; `auth.ts`/`userService` über Repositories.
- Preview-Module nur mit `SHOW_PREVIEW_MODULES=1`.
- **Performance:** Order-Stats per DB-Aggregation; gebündeltes `findByIds`; Realtime-Polling-Metriken; k6 `dashboard_stats`.
- Wizard Upgrade/Migration nutzen geführte Update-Pipeline; Installer-Fehlermeldungen.
- **Security Hardening:** CORS/Secret-Guards, Helmet-Baseline, Upload Content-Length, Impersonation-Audit (ADR 045).
- **Dokumentation:** Drei Ebenen (Ehrenamt/Admin/Maintainer), README gekürzt, Phase-Reports archiviert, Linkcheck in CI.

### Tests

- E2E `admin-navigation.spec.ts`, `authorization-matrix.test.ts`, Tenant-Guard CI, Installer-Ops-Tests.

---

## 2.2.1 - 2026-07-10

### Neu

- **Online-Installation ohne Git-Clone:** `curl -fsSL .../install.sh | bash` lädt Release-Archiv von GitHub und startet den TUI-Assistenten.
- Bootstrap-Tests (`installer/tests/bootstrap.test.sh`) für Online- und Lokalmodus.

### Behoben

- Tar-Entpacken im Online-Bootstrap: Exit-Code 141 durch `pipefail` und `tar | head` behoben.

---

## 2.2.0 - 2026-07-10

### Neu

- **Interaktiver TUI-Installations-Assistent** (`./install.sh`): 13-stufiger Wizard mit dialog/gum, Systemanalyse, Docker-Erkennung, Reverse-Proxy-Erkennung, automatische `.env`- und Compose-Generierung.
- **Rollback & Protokollierung:** Pre-Install-Backups, Fehlerbehandlung mit Retry/Rollback, Installationslogs unter `installer/logs/`.
- **ADRs 034–038:** Interactive Installer, Installation Wizard, Environment Detection, Configuration Generation, Rollback Strategy.

### Geändert

- README und neue Installationsanleitung (`docs/INSTALLATION.md`) mit Schnellstart über `./install.sh`.
- Version 2.2.0 in Backend, Frontend und Core.

---

## 2.1.0 - 2026-07-10

### Neu

- **Zentraler MailService:** SMTP-Konfiguration ausschließlich in der Plattformverwaltung (`/platform/email`); Verbindungstest, Testmail, Mail-Queue-Status.
- **Initial-Setup-Assistent:** 7-stufiger Einrichtungsassistent für neue Mandanten mit optionaler erster Veranstaltung.
- **Passwortlose Authentifizierung:** Magic Link und Login-Code; vier konfigurierbare Auth-Modi; Rate Limiting und Audit Logging.
- **Mail-Templates:** Login-Code, Magic-Link, Initial-Setup, Testmail.
- **ADRs 031–033:** Zentraler MailService, Setup Wizard, Passwortlose Authentifizierung.

### Geaendert

- Mandanten besitzen keine eigenen SMTP-Einstellungen mehr (nur Branding-Overrides).
- `User.passwordHash` ist optional (passwortlose Konten).
- Login-Seite zeigt je nach Plattformkonfiguration nur erlaubte Anmeldeverfahren.

### Migration

- Bestehende Mandanten werden bei Update als „eingerichtet“ markiert.
- Auth-Modus standardmäßig `password_or_magic` für Abwärtskompatibilität.

---

## 2.0.1 - 2026-07-10

### Geaendert (Rebranding)

- Produktname von **FestManager** auf **FestSchmiede** vereinheitlicht (UI, Dokumentation, Benachrichtigungen, OpenAPI, Docker-Images, Paketnamen).
- Repository: `TimUx/FestSchmiede`, Container-Images: `ghcr.io/timux/festschmiede/*`.
- Passend zur bestehenden App **KochSchmiede** in der Produktfamilie „Schmiede“.

### Hinweis

- Keine funktionalen Breaking Changes; APIs, Datenbankschema und Konfigurationspfade bleiben kompatibel.
- Nach dem Update ggf. `GHCR_IMAGE_PREFIX=ghcr.io/timux/festschmiede` in der `.env` setzen.

---


### Neu — Multi-Tenant-Plattform

- **Mandantenfähige Architektur:** Shared Database mit `tenantId`, `TenantContext` und `PlatformContext` (ADR-020–027).
- **Plattformadministration:** Dashboard, Mandantenverwaltung, Monitoring, globale Einstellungen unter `/platform`.
- **Tenant-Routing:** Subdomain- und Pfad-basierte Auflösung via `TenantResolver`; mandantenspezifisches Branding im Frontend.
- **Mandantenfähige Module:** Payment, Notifications, Legal, Printer mit tenant-scoped Settings und Daten.
- **Mandanten-Benachrichtigungen:** Eigener SMTP pro Mandant, Branding in Templates, Delivery-Logging (ADR-028).
- **Deployment:** Docker Compose mit Traefik, Wildcard-TLS, mandantenfähiger nginx-Konfiguration.

### Verbessert

- **Sicherheit:** Tenant-Isolation in APIs, JWT, Uploads, WebSockets; Host-Validation; Rate Limits (ADR-029).
- **Performance:** DB-Indizes, Slow-Request-Logging, k6-Lasttests bis 250 VUs, Frontend Code Splitting (ADR-030).
- **Monitoring:** Erweiterte `/api/health`, Platform-Monitoring mit System- und Socket-Metriken.
- **OpenAPI:** Version 2.0.0, mandantenfähige API-Struktur dokumentiert.

### Geaendert (Breaking)

| Alt (v1.x) | Neu (v2.0) |
|------------|------------|
| Single-Tenant | Multi-Tenant — Mandant aus Host/Pfad erforderlich |
| Keine Plattform-Admin-UI | `/platform` für Plattformadministration |
| Globale Settings | Plattform- vs. Mandanteneinstellungen getrennt |
| `CORE_VERSION` 1.5.0 | `CORE_VERSION` 2.0.0 |

### Migration

- Bestehende Single-Tenant-Installationen: Daten werden beim Start in den Default-Mandanten migriert (`migrateTenantSchema`).
- Siehe [Architektur-ADRs](docs/architecture/README.md).

### Dokumentation

- README, ROADMAP, SECURITY, Deployment-, Performance- und Notification-Guides aktualisiert.
- 10 Phase-Abschlussberichte (Phase 0–10) und ADRs 020–030.

---

## 1.5.0 - 2026-07-09

### Geaendert (Rebranding)

- Produktname von **Vereinsbestellung** auf **FestManager** vereinheitlicht (UI, Dokumentation, Benachrichtigungen, OpenAPI, Docker-Images, Paketnamen).
- Repository- und Image-Pfade: `FestManager` / `ghcr.io/timux/festmanager`.
- Terminologie: **Veranstalter** statt „Verein“, wo der Betreiber einer Veranstaltung gemeint ist (Admin-Bereich, Einstellungen, E-Mails).
- Bereich **Verein & Kontakt** heisst in der Oberflaeche **Veranstalter** (`/admin/verein` unveraendert).

### Dokumentation

- README, Guides, ROADMAP, CHANGELOG und Release Notes auf FestManager und erweiterte Zielgruppe aktualisiert.

### Hinweis

- Keine Breaking Changes: APIs, Datenbankschema, Berechtigungs-Keys und Konfigurationspfade bleiben kompatibel.
- Beispieldaten mit Vereinsnamen (z. B. Feuerwehr Musterstadt) und interne technische Bezeichner (`core.club`, `verein_token`) bleiben unveraendert.

---

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

---

## 1.3.0 - 2026-07-08

*Die 1.3-Reihe wurde bis **1.3.16** (2026-07-09) mit UX-, Sicherheits- und CI-Verbesserungen fortgefuehrt.*

### Neu

- **Plattformschicht:** SettingsService, Permission-System, AdminUiService, EventBus, HealthService, AuditService, ModuleMigrationService.
- **Metadata-first Admin-UI:** dynamische Navigation und Seiten (`GET /api/admin/ui`), generische Settings-Formulare.
- **Payment-Modul (produktionsreif):** Smart Payment (Bar/Online, QR, Live-Status), Payment-Admin unter `/admin/payment` (Dashboard, Provider, Zahlungsarten, Zahlungen, Refunds, Logs, Webhooks, Health, Statistiken).
- **Notifications-Modul:** SMTP, ntfy, Discord, Slack, Microsoft Teams; Konfiguration unter `/admin/settings/module.notifications`.
- **Printer-Modul:** Grundgeruest fuer Bondruck (Adapter, Hooks, PDF).
- **Einrichtungsassistent** (`/admin/einrichtung`) fuer die Erstkonfiguration.
- **Zahlungs-Presets** (nur Bar / Bar+Karte / Online) und **Rollen-Presets** in der Team-Verwaltung.
- **RealtimeService** mit WebSocket und intelligentem Polling-Fallback.

### Verbessert

- Admin-Bereich vereinfacht: **Funktionen** statt Modul-Jargon; nur produktionsreife Module sichtbar (`productionReady`).
- Stripe-Haertung: Webhook-Idempotenz, granulare Payment-Berechtigungen, POS-/Kassen-QR.
- Mitarbeiter-Bestelluebersicht zeigt E-Mail und Telefon unter dem Kundennamen.
- **Sicherheit:** Lookup-Token fuer oeffentlichen Bestellstatus; Session-Widerruf bei Logout und deaktivierten Nutzern; gehaertete Bild-Upload-Pipeline (Sharp).
- Ausgehender Nachrichtenversand vollstaendig ueber das Benachrichtigungsmodul; zentrale E-Mail-Templates (`templates/de.ts`).
- Umfangreiche **QA/CI-Pipeline** (GitHub Actions, Vitest, Playwright, Modul-Szenarien, Nightly, Release Validation).

### Geaendert (Breaking)

| Alt | Neu |
|-----|-----|
| `/admin/module/payment` | `/admin/payment` |
| `/admin/email` | `/admin/settings/module.notifications` |
| `PAYMENT_ENCRYPTION_KEY` | `APP_ENCRYPTION_KEY` |
| Hardcodierte Settings-Seiten | Generische Settings |

### Dokumentation

- ADRs 001–011, Migrationsplan, Modul-Architektur-Handbuch, Operations- und Security-Doku.
- Screenshots fuer Payment-Admin und Benachrichtigungen.

---

## 1.2.0 - 2026-07-08

### Neu

- **Modulsystem** mit vollstaendigem Lifecycle (installieren, aktivieren, deaktivieren, Health Check).
- Admin-Oberflaeche **Modulverwaltung** (`/admin/module`); Module werden mit dem Docker-Image ausgeliefert.
- **Payment-Modul** als erstes offizielles Modul: Stripe (Checkout, Webhooks, Refunds, Sandbox), PayableResource-Abstraktion, verschluesselte API-Schluessel.
- Platzhalter-Anbieter: PayPal, VR Payment, S-Payment, PAYONE, SumUp.
- Neun Stub-Module vorbereitet (u. a. Inventory, Printer, Voucher, Notifications).

### Verbessert

- Optionale Erweiterungen ohne Aenderungen am Core aktivierbar.

### Dokumentation

- Neues Modul-Architektur-Handbuch; Admin-, Developer- und User-Guide aktualisiert.
- Screenshots: Modulverwaltung, Payment-Einstellungen.

> **Hinweis:** Ohne aktiviertes Payment-Modul verhaelt sich die Plattform wie zuvor (Barzahlung an der Kasse).

---

## 1.1.0 - 2026-07-08

### Neu

- **Bestell-Einstellungen:** konfigurierbare Pflichtfelder (Vorname, Nachname, E-Mail, Telefon) und Stornierungsfrist in Stunden.
- **Kunden-Stornierung** auf der Statusseite mit Nachnamen-Bestaetigung.
- **E-Mail-Versand im Admin:** SMTP-Konfiguration unter `/admin/email`, optionaler Freitext in Bestell- und Stornierungsmails.

### Verbessert

- Bestaetigungs- und Stornierungsmails mit Vereinsdaten, Bestelldetails, rechtlichen Hinweisen und Status-Link.
- Schema-Erweiterung in `ClubSettings` fuer Pflichtfelder, SMTP und Freitext.

### Geaendert

- SMTP-Einstellungen wandern von Umgebungsvariablen in den Admin-Bereich (einmalige Nachkonfiguration nach Update noetig).

### Dokumentation

- Guides und Screenshots aktualisiert.

---

## 1.0.0 - 2026-07-08

Erste stabile Version der FestSchmiede-Plattform.

### Neu

- **Oeffentlicher Bereich:** touch-optimierte Bestellseite, Vorausbestellungen, Kundenstatus per WebSocket, Kontaktseite, Abholboard, Bot-Schutz (Honeypot, Zeitpruefung, optional Turnstile).
- **Mitarbeiterbereich:** Dashboard mit Live-Statistiken, Kuechenansicht, Abholung, Bestellung vor Ort, Bestelluebersicht.
- **Administration:** Verein & Kontakt, Benutzerverwaltung, Veranstaltungs- und Speisenverwaltung mit Bild-Upload.
- **Betrieb:** Docker Compose, PostgreSQL, PWA, automatischer Build der Images in `ghcr.io/timux/festschmiede/`.

### Dokumentation

- Admin-, User- und Developer-Guide; Schnellstart und Standard-Zugangsdaten nach Seed (`admin@verein.local`).

### Stack

React/TypeScript · MUI · Node/Express · Prisma · PostgreSQL · Socket.IO · Docker
