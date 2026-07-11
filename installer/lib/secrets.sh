#!/usr/bin/env bash
# FestSchmiede Installer – Sichere Schlüsselgenerierung

generate_secret() {
  local length="${1:-48}"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 "$length" | tr -d '/+=' | head -c "$length"
  else
    head -c "$length" /dev/urandom | base64 | tr -d '/+=' | head -c "$length"
  fi
}

generate_hex_secret() {
  local bytes="${1:-32}"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$bytes"
  else
    head -c "$bytes" /dev/urandom | xxd -p -c "$bytes"
  fi
}

generate_db_password() {
  generate_secret 24
}

generate_all_secrets() {
  log_info "Generiere sichere Zufallswerte..."

  SECRETS[JWT_SECRET]="${SECRETS[JWT_SECRET]:-$(generate_secret 64)}"
  SECRETS[APP_ENCRYPTION_KEY]="${SECRETS[APP_ENCRYPTION_KEY]:-$(generate_secret 48)}"
  SECRETS[SESSION_SECRET]="${SECRETS[SESSION_SECRET]:-$(generate_secret 48)}"
  SECRETS[COOKIE_SECRET]="${SECRETS[COOKIE_SECRET]:-$(generate_secret 48)}"
  SECRETS[WEBHOOK_SECRET]="${SECRETS[WEBHOOK_SECRET]:-$(generate_hex_secret 32)}"
  SECRETS[API_SECRET]="${SECRETS[API_SECRET]:-$(generate_hex_secret 32)}"
  SECRETS[POSTGRES_PASSWORD]="${SECRETS[POSTGRES_PASSWORD]:-$(generate_db_password)}"
  SECRETS[REDIS_PASSWORD]="${SECRETS[REDIS_PASSWORD]:-$(generate_db_password)}"
  SECRETS[PLATFORM_ADMIN_PASSWORD]="${SECRETS[PLATFORM_ADMIN_PASSWORD]:-$(generate_secret 20)}"

  # In CFG übernehmen
  CFG[JWT_SECRET]="${CFG[JWT_SECRET]:-${SECRETS[JWT_SECRET]}}"
  CFG[APP_ENCRYPTION_KEY]="${CFG[APP_ENCRYPTION_KEY]:-${SECRETS[APP_ENCRYPTION_KEY]}}"
  CFG[POSTGRES_PASSWORD]="${CFG[POSTGRES_PASSWORD]:-${SECRETS[POSTGRES_PASSWORD]}}"
  CFG[PLATFORM_ADMIN_PASSWORD]="${CFG[PLATFORM_ADMIN_PASSWORD]:-${SECRETS[PLATFORM_ADMIN_PASSWORD]}}"
}

load_secrets_from_env() {
  for key in JWT_SECRET APP_ENCRYPTION_KEY POSTGRES_PASSWORD PLATFORM_ADMIN_PASSWORD; do
    [[ -n "${CFG[$key]:-}" ]] && SECRETS[$key]="${CFG[$key]}"
  done
}

format_secrets_summary() {
  local s=""
  s+="Generierte Secrets (Längen):"
  s+=$'\n'
  s+=$'\n'"  JWT Secret           ${#SECRETS[JWT_SECRET]} Zeichen"
  s+=$'\n'"  Verschlüsselung      ${#SECRETS[APP_ENCRYPTION_KEY]} Zeichen"
  s+=$'\n'"  Datenbank            ${#SECRETS[POSTGRES_PASSWORD]} Zeichen"
  s+=$'\n'"  Admin-Passwort       ${#SECRETS[PLATFORM_ADMIN_PASSWORD]} Zeichen"
  s+=$'\n'"  Webhook/API          generiert"
  printf '%s' "$s"
}
