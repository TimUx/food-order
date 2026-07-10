export const PLATFORM_FEATURES = [
  { title: 'Bestellungen', description: 'Online-Bestellungen, Kassenverkauf und Statusverfolgung für Gäste und Helfer.' },
  { title: 'Küche', description: 'Übersichtliche Küchenansicht mit Echtzeit-Updates für reibungslose Abläufe.' },
  { title: 'Abholung', description: 'Abholboard und Benachrichtigungen, damit Gäste ihre Bestellung schnell erhalten.' },
  { title: 'Online-Zahlungen', description: 'Flexible Zahlungsanbieter für bargeldlose Abwicklung vor Ort und online.' },
  { title: 'Benachrichtigungen', description: 'E-Mail-Benachrichtigungen für Bestellungen, Status und Verwaltung.' },
  { title: 'Auswertungen', description: 'Dashboard und Statistiken für fundierte Entscheidungen während der Veranstaltung.' },
  { title: 'Veranstaltungsorganisation', description: 'Veranstaltungen, Speisen, Module und Einstellungen zentral verwalten.' },
];

export const PLATFORM_BENEFITS = [
  'Speziell für Vereine und gemeinnützige Organisationen entwickelt',
  'Mandantenfähig – jede Organisation erhält eine eigene Instanz',
  'Open Source – transparent, erweiterbar und unabhängig',
  'Modular – nur die Funktionen aktivieren, die wirklich gebraucht werden',
  'Responsive – funktioniert auf Smartphone, Tablet und Desktop',
  'Ehrenamtlich gedacht – weniger Papierkram, mehr Zeit fürs Fest',
];

export const TARGET_GROUPS = [
  'Vereine und gemeinnützige Organisationen',
  'Schulen und Jugendgruppen',
  'Feuerwehren und Hilfsorganisationen',
  'Kommunen und kleinere Veranstaltungen',
  'Schützenfeste, Dorffeste und Vereinsfeste',
];

export const FAQ_ITEMS = [
  {
    q: 'Was kostet FestManager?',
    a: 'FestManager ist Open Source. Der Betrieb kann selbst gehostet oder über einen Plattform-Mandanten erfolgen. Für gemeinnützige Organisationen kann ein kostenloser Mandant beantragt werden.',
  },
  {
    q: 'Ist FestManager Open Source?',
    a: 'Ja. Der Quellcode ist auf GitHub verfügbar. Sie können mitlesen, Verbesserungen vorschlagen und selbst hosten.',
  },
  {
    q: 'Wer darf einen Mandanten beantragen?',
    a: 'Vereine, gemeinnützige Organisationen, Schulen, Hilfsorganisationen und ähnliche Gruppen, die FestManager für ihre Veranstaltungen nutzen möchten.',
  },
  {
    q: 'Kann ich FestManager selbst hosten?',
    a: 'Ja. Die Plattform kann eigenständig betrieben werden. Dokumentation und Quellcode unterstützen Sie beim Setup.',
  },
  {
    q: 'Welche Zahlungsanbieter werden unterstützt?',
    a: 'FestManager unterstützt modulare Zahlungsintegrationen. Konkrete Anbieter hängen von der Mandanten-Konfiguration ab.',
  },
  {
    q: 'Brauche ich technisches Know-how?',
    a: 'Für den täglichen Betrieb nicht. Die Verwaltung ist webbasiert. Für Self-Hosting sind grundlegende Server-Kenntnisse hilfreich.',
  },
];

export const SCREENSHOTS = [
  { src: '/screenshots/06-dashboard.png', title: 'Dashboard', alt: 'FestManager Dashboard mit Statistiken' },
  { src: '/screenshots/09-bestellung.png', title: 'Bestellung', alt: 'Öffentliche Bestellseite' },
  { src: '/screenshots/07-kuechenansicht-tablet.png', title: 'Küche', alt: 'Küchenansicht auf dem Tablet' },
  { src: '/screenshots/21-payment-admin.png', title: 'Zahlungen', alt: 'Zahlungseinstellungen in der Administration' },
  { src: '/screenshots/16-admin-uebersicht.png', title: 'Administration', alt: 'Administrationsübersicht' },
  { src: '/screenshots/20-modulverwaltung.png', title: 'Module', alt: 'Modulverwaltung' },
];

export const ORGANIZATION_TYPES = [
  'Verein',
  'Gemeinnützige Organisation',
  'Schule / Bildungseinrichtung',
  'Feuerwehr / Hilfsorganisation',
  'Kommune / Öffentliche Einrichtung',
  'Sonstige',
];
