# Payment Integration – Abschlussbericht Spec 6.5

| Feld | Wert |
|------|------|
| **Datum** | 2026-07-08 |
| **Phase** | 6.5 – Final Review, Optimization & Release Validation |
| **Empfehlung** | **Produktionsreif (Stripe-Einsatz)** |

---

## 1. Zusammenfassung

Die Payment-Integration (Specs 6.1–6.4) wurde aus neun Perspektiven geprüft: Architektur, UX, Performance, Security, Wartbarkeit, Barrierefreiheit, Vereinspraxis, Admin und Tests.

**Ergebnis:** Die Architektur entspricht den ADRs. Der Ablauf ist für ehrenamtliche Helfer und Besucher verständlich. Kritische Sicherheits- und Zuverlässigkeitsprobleme wurden in dieser Phase behoben.

**Einschränkung:** Nur **Stripe** ist voll implementiert. PayPal und weitere Provider sind Platzhalter. Für Sommerfeste und Vereinsveranstaltungen mit Stripe ist die Lösung **einsatzbereit**.

---

## 2. Gesamtbewertung

| Kategorie | Bewertung | Kurzbegründung |
|-----------|-----------|----------------|
| Architektur | ★★★★☆ | Saubere Plattform-Integration, PayableResource entkoppelt |
| UX (öffentlich) | ★★★★☆ | Smart Payment, klare Sprache, wenige Klicks |
| UX (Kasse) | ★★★★★ | Bar Default, Vollbild-QR, Auto-Close |
| UX (Admin) | ★★★★☆ | Verständlich, Hilfetexte; Detaildialog noch technisch |
| Performance | ★★★★☆ | Lazy-Load, Paging; Polling optimiert |
| Security | ★★★★☆ | Nach Fixes solide; Session-Ownership offen |
| Wartbarkeit | ★★★★☆ | Modul klar strukturiert, wenig Duplikate |
| Erweiterbarkeit | ★★★★★ | Provider-Interface, SettingsService, Metadata |
| Barrierefreiheit | ★★★☆☆ | Grundlagen (ARIA, Touch); kein Voll-Audit |
| Open Source Qualität | ★★★★☆ | ADRs, Tests, klare Module |
| Testbarkeit | ★★★☆☆ | Unit-Tests; Playwright/E2E fehlen |

**Gesamt: ★★★★☆ (4,2/5)**

---

## 3. Architekturbewertung

### Stärken

- **PaymentService** als einzige öffentliche API – Core kennt keine Provider
- **PayableResource** – Payment-Modul ohne Order-Wissen
- **SettingsService** – alle Konfiguration in der WebUI, verschlüsselt
- **EventBus + Audit** – nachvollziehbare Ereigniskette
- **Metadata Registry** – Admin-Navigation deklarativ

### Behoben in 6.5

- Webhook-Idempotenz: Event wird erst **nach erfolgreicher Verarbeitung** gespeichert
- `dispatchPaymentOutcome` idempotent bei bereits bezahlten Sessions
- Timeout-Markierung nur per conditional `UPDATE` (keine doppelten Side-Effects)
- Doppelte Refund-Routen und tote Admin-Settings-Route entfernt
- Admin-Berechtigungen pro Endpunkt (nicht nur `payment.view`)

### Verbleibende Architektur-Hinweise

- Öffentliche Payment-API existiert doppelt (Core `/api/public/payment/*` und Modul) – funktional OK, langfristig konsolidieren
- Refund aktualisiert Payment-Status in DB noch nicht vollständig (Stripe-Call funktioniert)

---

## 4. UX-Bewertung

### Öffentliche Bestellung ★★★★☆

| Frage | Antwort |
|-------|---------|
| Versteht ein Besucher den Ablauf? | Ja – „Online bezahlen“ / „Vor Ort bezahlen“, QR + Link |
| Unnötige Klicks? | Nein bei Smart Payment (Auto-Auswahl wenn eindeutig) |
| Fehlermeldungen hilfreich? | Ja – deutsch, mit Retry und Zahlungsart-Wechsel |
| **Fix 6.5** | „Andere Zahlungsart“ während Wartezeit; Fehler wenn Checkout fehlt |

### Kassenmodus ★★★★★

- Bar vorausgewählt → ein Klick für Barzahlung
- Vollbild-QR für Kunden, Mitarbeiter sieht Status
- Auto-Close nach Erfolg → schneller nächster Kunde

### Admin ★★★★☆

- Tabs statt technischer Menüs
- Hilfetexte zu API-Schlüsseln
- Administrator kann Stripe einrichten ohne Entwickler-Wissen
- Detaildialog zeigt noch rohe Feldnamen → mittelfristig verbessern

---

## 5. Security-Bewertung ★★★★☆

| Maßnahme | Status |
|----------|--------|
| Webhook-Signaturen (Stripe) | ✅ |
| Replay-Schutz | ✅ (nach Fix: record after success) |
| Secrets verschlüsselt | ✅ SettingsEncryption |
| Admin-Berechtigungen | ✅ (nach Fix: granular) |
| Refund nur mit `payment.refund` | ✅ (nach Fix) |
| SQL Injection | ✅ parametrisierte Queries |
| CSRF | ✅ JWT-Auth für Admin |
| Webhook rawBody | ✅ Fail-closed ohne rawBody |
| Stripe `payment_status` | ✅ Nur `paid` löst Freigabe aus |

### Offen (nicht kritisch für Stripe-Pilot)

- Öffentliches Cancel/Retry nur per Session-UUID (kein Order-Token-Binding)
- Kein Webhook-Rate-Limit
- `APP_ENCRYPTION_KEY`-Fallback in Dev-Umgebung

---

## 6. Performance-Bewertung ★★★★☆

| Bereich | Bewertung |
|---------|-----------|
| Lazy-Load Zahlungsarten | ✅ Erst bei ausgefülltem Formular |
| Admin-Listen | ✅ Paging; SQL-Filter für Provider/Event |
| Polling | ✅ 3s öffentlich / 2,5s POS; Leak behoben |
| QR-Code | ✅ Lokal (kein externer Request mehr) |
| Webhooks | ✅ Idempotent, kein Blocking |

---

## 7. Open Source Qualität ★★★★☆

- ADR-007 dokumentiert Architektur und Specs 6.1–6.5
- Modul-Manifest (`module.json`) mit Permissions, Reports, Settings
- Unit-Tests Backend + Frontend
- Klare Trennung Provider / Manager / Service

---

## 8. Gefundene Probleme (Auswahl)

| Schwere | Problem |
|---------|---------|
| **Kritisch** | Refund unter `payment.view` erreichbar |
| **Kritisch** | Webhook-Event vor Verarbeitung gespeichert → Retry blockiert |
| **Kritisch** | Stripe `checkout.session.completed` ohne `payment_status`-Prüfung |
| **Hoch** | Alle Admin-Endpunkte nur `payment.view` |
| **Hoch** | QR-Code über api.qrserver.com (Datenschutz) |
| **Hoch** | Polling-Intervalle dupliziert nach Retry |
| **Hoch** | `required && checkoutUrl` – fehlende URL führte zu Erfolg ohne Zahlung |
| **Mittel** | Admin-Listenfilter in SQL unvollständig |
| **Mittel** | Dashboard-Umsatz zählte alle Zahlungen |
| **Niedrig** | Doppelte Refund-Routen, tote Settings-Route |

---

## 9. Behobene Probleme (Spec 6.5)

| Fix | Datei(en) |
|-----|-----------|
| Granulare Admin-Permissions pro Route | `adminRoutes.ts` |
| Webhook-Idempotenz nach Erfolg | `PaymentManager.ts`, `paymentRepository.ts` |
| Idempotente Outcome-Verarbeitung | `PaymentManager.ts` |
| Conditional Timeout-Update | `paymentRepository.ts`, `PaymentManager.ts` |
| Stripe nur bei `payment_status=paid` | `StripeProvider.ts` |
| Webhook ohne rawBody → 400 | `routes.ts` |
| SQL-Filter Provider/Event in Admin-Listen | `paymentAdminRepository.ts` |
| Dashboard-Umsatz nur erfolgreiche Zahlungen | `paymentAdminRepository.ts` |
| Audit-Filter nach Provider | `paymentAdminRepository.ts` |
| QR lokal mit `qrcode` + Fallback-Link | `PaymentQrCode.tsx` |
| Polling-Leak behoben | `PaymentDialog.tsx`, `PosPaymentDialog.tsx` |
| Checkout-Fehler wenn URL fehlt | `OrderPage.tsx`, `BestellungPage.tsx` |
| „Andere Zahlungsart“ während Wartezeit | `PaymentDialog.tsx` |
| Fieldset-Legende ARIA | `PaymentMethodSelector.tsx` |
| Doppelte Refund-/Settings-Routen entfernt | `routes.ts`, `Module.ts` |
| Tests erweitert | `payment.test.ts`, `paymentSelection.test.ts` |

---

## 10. Noch offene Punkte

| Priorität | Punkt |
|-----------|-------|
| Hoch | PayPal, VR Payment, SumUp etc. implementieren |
| Hoch | Refund: Payment-Status + Transaktion in DB aktualisieren |
| Mittel | Playwright E2E für Bestell- und Kassen-Flow |
| Mittel | Öffentliches Cancel/Retry an Order/Token binden |
| Mittel | Admin-Detaildialog mit deutschen Labels |
| Niedrig | Webhook-Rate-Limit |
| Niedrig | Serverseitiger PDF/Excel-Export |
| Niedrig | Status-Sync IN_KITCHEN/READY im Payment-Modell |

---

## 11. Empfehlung

### **Produktionsreif (Stripe-Einsatz)**

**Begründung:**

- Architektur entspricht ADRs; keine Regression bei Barzahlung oder deaktiviertem Modul
- Smart Payment vollständig; Provider nach außen gekapselt
- Kritische Security- und Webhook-Probleme behoben
- UX für Besucher, Kassierer und Admin ohne technisches Vorwissen nutzbar
- Mobile/Tablet/Touch optimiert (≥56px Touch-Ziele)

**Bedingungen für Go-Live:**

1. Stripe im **Testmodus** durchspielen (Bestellung, Kasse, Webhook, Refund)
2. `APP_ENCRYPTION_KEY` in Produktion setzen
3. Webhook-URL in Stripe Dashboard eintragen
4. Nur Zahlungsarten aktivieren, die wirklich benötigt werden
5. `npm install` im Frontend ausführen (neue `qrcode`-Abhängigkeit)

**Nicht produktionsreif für:** Multi-Provider-Betrieb ohne Stripe, bis weitere Provider implementiert sind.

---

## 12. Verbesserungsvorschläge (priorisiert)

### Kritisch (behoben)

| Problem | Lösung | Status |
|---------|--------|--------|
| Refund ohne Berechtigung | `payment.refund` auf POST `/refunds` | ✅ |
| Webhook stuck on failure | Record after success + replay check | ✅ |
| Unpaid Stripe session completed | `payment_status === 'paid'` | ✅ |

### Hoch

| Problem | Auswirkung | Lösung | Aufwand | Risiko |
|---------|------------|--------|---------|--------|
| Refund ohne DB-Update | Admin sieht falschen Status | Payment auf REFUNDED setzen | M | Niedrig |
| Session-UUID öffentlich cancelbar | Missbrauch möglich | Order-Token oder HMAC | M | Mittel |
| Keine E2E-Tests | Regression unbemerkt | Playwright-Szenarien | L | Niedrig |
| PayPal fehlt | Nur Stripe nutzbar | Provider implementieren | XL | Mittel |

### Mittel

| Problem | Lösung | Aufwand |
|---------|--------|---------|
| Admin-Detail rohe Keys | Label-Map für Detailfelder | S |
| Öffentlich vs. Modul-API doppelt | Eine Route-Oberfläche | M |
| Webhook Rate-Limit | middleware auf `/webhooks/*` | S |

### Niedrig

| Problem | Lösung | Aufwand |
|---------|--------|---------|
| PDF-Export serverseitig | pdfkit oder Druckvorlage | M |
| `prefers-reduced-motion` überall | CSS-Media-Query | S |

---

## 13. Akzeptanzkriterien Spec 6.5

| Kriterium | Status |
|-----------|--------|
| Architektur entspricht ADRs | ✅ |
| Keine Regressionen (Bar, ohne Modul, deaktiviert) | ✅ |
| Smart Payment vollständig | ✅ |
| Provider gekapselt | ✅ |
| UX einfach | ✅ |
| Mobile/Tablet/Touch | ✅ |
| Barrierefrei (Grundlagen) | ⚠️ Teilweise |
| Security geprüft | ✅ (kritische Fixes) |
| Performance geprüft | ✅ |
| Tests erweitert | ✅ Unit; E2E offen |
| Dokumentation aktuell | ✅ ADR-007 + dieser Bericht |

---

## 14. Regression-Matrix

| Szenario | Erwartung | Status |
|----------|-----------|--------|
| Modul deaktiviert | Barablauf wie bisher | ✅ |
| Barzahlung POS | Sofort Küche | ✅ |
| Ein Provider (Stripe) | Checkout + Webhook | ✅ |
| Provider deaktiviert | Nicht in Methodenliste | ✅ |
| Fehlerhafter Provider | Health-Warnung, kein Crash | ✅ |
| Mehrere Veranstaltungen | Event-Filter Admin | ✅ |
| Timeout | Retry möglich | ✅ |
| Doppelter Webhook | Ignoriert (Replay) | ✅ (nach Fix) |

---

*Leitgedanke bestätigt: Maximale Einfachheit für den Benutzer, maximale Qualität unter der Haube.*
