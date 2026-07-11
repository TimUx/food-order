# FestSchmiede Installer

Professioneller interaktiver Installations-Assistent (TUI) für die FestSchmiede-Plattform.

## Starten

### Online (ohne Git-Clone)

```bash
curl -fsSL https://raw.githubusercontent.com/TimUx/FestSchmiede/v2.3.0/install.sh | bash
```

### Lokal (nach Git-Clone)

```bash
./install.sh
```

## Architektur

```
install.sh
  └── installer/install.sh      # Orchestrator
        ├── lib/tui.sh          # dialog / gum / whiptail
        ├── lib/detect.sh       # System- & Infrastruktur-Erkennung
        ├── lib/validate.sh     # Eingabevalidierung
        ├── lib/secrets.sh      # Sichere Schlüsselgenerierung
        ├── lib/config.sh       # .env & Compose-Generierung
        ├── lib/docker.sh       # Docker-Installation & Compose
        ├── lib/rollback.sh     # Backup & Rollback
        └── lib/wizard.sh       # 13 Wizard-Schritte
```

## Tests

```bash
./installer/tests/run-tests.sh
```

## Dokumentation

- [Installationsanleitung](../docs/INSTALLATION.md)
- [ADR 034](../docs/architecture/034-interactive-installer.md)
