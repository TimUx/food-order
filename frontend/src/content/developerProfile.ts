export const DEVELOPER_PROFILE = {
  name: 'Timo Braun',
  tagline: 'Technikliebe, Hundeliebe, Bergliebe',
  location: 'Willingshausen, Hessen',
  website: 'https://www.timobraun.de',
  github: 'https://github.com/TimUx',
  personalPage: 'https://www.timobraun.de/ueber-mich',
};

export const DEVELOPER_TRAITS = [
  'Neugierig und lernbereit',
  'Immer am Basteln und Optimieren',
  'Für andere da – im Beruf wie im Ehrenamt',
  'Open Source und Transparenz',
];

export const FIRE_DEPARTMENT_ROLES = [
  'Atemschutzgeräteträger',
  'Maschinist',
  'Digitalfunk-Beauftragter der Gemeinde',
  'Presse- & Medienbetreuer',
  'Unterstützer der Kinder- & Jugendfeuerwehr',
  'Administrator für Pager & Funkgeräte',
];

export interface DeveloperProject {
  name: string;
  description: string;
  url: string;
  language?: string;
  highlight?: boolean;
}

/** Ausgewählte Open-Source-Projekte von github.com/TimUx */
export const DEVELOPER_PROJECTS: DeveloperProject[] = [
  {
    name: 'FestSchmiede',
    description:
      'Open-Source-Plattform zur Organisation von Veranstaltungen – Bestellungen, Küche, Abholung und Verwaltung für Vereine.',
    url: 'https://github.com/TimUx/FestSchmiede',
    language: 'TypeScript',
    highlight: true,
  },
  {
    name: 'alarm-system',
    description: 'Komplettes Alarmierungssystem mit Monitor, Messenger, Mail-Parser und Anbindung an Leitstellen-Mails.',
    url: 'https://github.com/TimUx/alarm-system',
    language: 'Shell',
    highlight: true,
  },
  {
    name: 'alarm-monitor',
    description: 'Monitor für Feuerwehr-Alarmierungen – Anzeige und Weiterleitung von Einsatzmeldungen.',
    url: 'https://github.com/TimUx/alarm-monitor',
    language: 'Python',
  },
  {
    name: 'alarm-messenger',
    description: 'Alarmierung auf Mobilgeräte mit Rückmeldefunktion für Einsatzkräfte.',
    url: 'https://github.com/TimUx/alarm-messenger',
    language: 'TypeScript',
  },
  {
    name: 'fw-lagekarte',
    description: 'Digitale Lagekarte für Großeinsätze – Übersicht und Koordination vor Ort.',
    url: 'https://github.com/TimUx/fw-lagekarte',
    language: 'JavaScript',
  },
  {
    name: 'TEL-System',
    description: 'Webbasiertes Tool zur Planung und Koordination großer Einsatzlagen (z. B. Unwetter-Module).',
    url: 'https://github.com/TimUx/TEL-System',
    language: 'Python',
  },
  {
    name: 'KochSchmiede',
    description: 'Self-hosted Rezepteverwaltung – Schwesterprojekt im „Schmiede“-Universum.',
    url: 'https://github.com/TimUx/KochSchmiede',
    language: 'TypeScript',
  },
  {
    name: 'docker-mailserver-webui',
    description: 'Weboberfläche zur Verwaltung eines Docker-Mailservers.',
    url: 'https://github.com/TimUx/docker-mailserver-webui',
    language: 'TypeScript',
  },
  {
    name: 'fpp-web-control',
    description: 'Gäste-Web-App zum Steuern des Falcon Player – Playlists starten, Liedwünsche entgegennehmen.',
    url: 'https://github.com/TimUx/fpp-web-control',
    language: 'HTML',
  },
  {
    name: 'Dienstplan',
    description: 'Tool zur automatischen Zuweisung von Schichtdiensten im Ehrenamt.',
    url: 'https://github.com/TimUx/Dienstplan',
    language: 'Python',
  },
];
