# ADR 043: Tenant Role Templates

**Status:** Accepted  
**Datum:** 2026-07-10  
**Kontext:** Prompt 5 — Rollenmodell

## Kontext

Bisher kannten Mandanten nur die technischen Rollen `ADMIN` und `STAFF`. Alle STAFF-Nutzer teilten sich eine **globale** Permission-Liste auf der `Role`-Tabelle — eine Änderung für einen Küchen-Mitarbeiter betraf alle Helfer im Verein.

Vereine denken in **fachlichen Aufgaben**: Küche, Abholung, Kasse, Speisenpflege, Finanzen, Rechtliches.

## Entscheidung

1. **Permission-first:** Jede API-Aktion prüft konkrete Permission-Keys (`orders.kitchen`, `team.manage`, `payment.settings`, …).
2. **Rollen-Vorlagen:** Sechs mandantenweite Templates (`kueche`, `abholung`, `kasse`, `speisenpflege`, `finanzen`, `rechtliches`) bündeln Permissions für die Team-UI.
3. **Per-User Permissions:** `User.permissions` (JSON) speichert die effektiven Rechte; `User.roleTemplate` dokumentiert die gewählte Vorlage.
4. **ADMIN bleibt Superuser:** `RoleName.ADMIN` behält Vollzugriff; `STAFF` erhält nur zugewiesene Keys.
5. **Delegierter Admin-Zugang:** STAFF mit Modul- oder Core-Admin-Permissions (z. B. `payment.view`, `food.edit`) dürfen `/admin` betreten — einzelne Routen prüfen fein granular.
6. **Migration:** Bestehende STAFF-User erhalten per SQL-Migration die globale STAFF-Liste oder das Küche-Template als Fallback.

## Vorlagen

| Vorlage | Fokus | Kein Zugriff auf |
|---------|-------|------------------|
| Küche | Küchenmonitor, Bondruck | Team, Settings, Payment-Config |
| Abholung | Abholung bestätigen | Admin, Payment |
| Kasse | Kasse, Zahlungsstatus lesen | Team, Payment-Settings |
| Speisenpflege | Speisen, Veranstaltungen | Team, Finanzen |
| Finanzen | Zahlungen, Statistiken | Team |
| Rechtliches | Impressum, AGB | Team, Payment-Settings |

## Kompatibilität

- `Role.permissions` auf STAFF bleibt erhalten, wird aber **deprecated** — Fallback wenn `User.permissions` leer.
- `PUT /admin/permissions/staff` bleibt für Übergang, markiert als deprecated.
- Bestehende ADMIN-Nutzer unverändert.

## Akzeptanz

- Kassenkraft (`kasse`) kann Bestellungen bearbeiten, aber weder `GET /admin/users` noch `PUT /admin/settings/module.payment` (403).
