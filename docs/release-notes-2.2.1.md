# FestSchmiede 2.2.1 – Online-Installation ohne Git-Clone

**Veröffentlichung:** 2026-07-10

## Highlights

### Online-Bootstrap

Installation ohne `git clone` – ein Befehl reicht:

```bash
curl -fsSL https://raw.githubusercontent.com/TimUx/FestSchmiede/v2.2.1/install.sh | bash
```

Alternativ mit `wget`:

```bash
wget -qO- https://raw.githubusercontent.com/TimUx/FestSchmiede/v2.2.1/install.sh | bash
```

Das Bootstrap-Skript lädt das Release-Archiv von GitHub, entpackt es ins Zielverzeichnis (`~/festschmiede` bzw. `/opt/festschmiede` als root) und startet den TUI-Installations-Assistenten.

### Umgebungsvariablen

| Variable | Beschreibung |
|----------|--------------|
| `FESTSCHMIEDE_INSTALL_DIR` | Zielverzeichnis |
| `FESTSCHMIEDE_VERSION` | Release-Version (Standard: 2.2.1) |
| `FESTSCHMIEDE_BOOTSTRAP_ONLY=1` | Nur herunterladen, kein Wizard |
| `FESTSCHMIEDE_FORCE_DOWNLOAD=1` | Bei bestehender Installation neu laden |

## Behoben

- Tar-Entpacken im Online-Bootstrap: Exit-Code 141 (`pipefail` + `tar | head`) behoben.

## Tests

```bash
bash installer/tests/bootstrap.test.sh
bash installer/tests/run-tests.sh
```
