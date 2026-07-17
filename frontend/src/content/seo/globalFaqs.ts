import type { FaqCategory, SeoFaqItem } from './types';

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'allgemein',
    title: 'Produkt & Einsatz',
    description: 'Was FestSchmiede ist und für wen es sich eignet.',
  },
  {
    id: 'kosten-open-source',
    title: 'Kosten & Open Source',
    description: 'Lizenz, Kostenmodell und Transparenz.',
  },
  {
    id: 'mandant-start',
    title: 'Mandant & Einstieg',
    description: 'Bewerbung, Ersteinrichtung und erste Schritte.',
  },
  {
    id: 'bestaellung-ablauf',
    title: 'Bestellung, Küche & Abholung',
    description: 'Abläufe vom Bestellen bis zur Ausgabe.',
  },
  {
    id: 'zahlung',
    title: 'Zahlung',
    description: 'Online-Zahlung, Bargeld und Kasse.',
  },
  {
    id: 'helfer-alltag',
    title: 'Helfer & Alltag',
    description: 'Rollen, Geräte und typische Festfragen.',
  },
  {
    id: 'technik-hosting',
    title: 'Technik & Hosting',
    description: 'Self-Hosting, Module und technische Voraussetzungen.',
  },
  {
    id: 'datenschutz',
    title: 'Datenschutz',
    description: 'Datenhaltung und Mandantentrennung.',
  },
];

/** Globale FAQ-Sammlung für /faq (kategorisiert). */
export const SEO_GLOBAL_FAQS: SeoFaqItem[] = [
  {
    category: 'allgemein',
    q: 'Was ist FestSchmiede?',
    a: 'FestSchmiede ist eine Open-Source-Plattform für Veranstaltungs-Bestellungen. Vereine und gemeinnützige Organisationen steuern damit Vorausbestellung, Küche, Abholung, Kasse und Administration – mandantenfähig und webbasiert.',
  },
  {
    category: 'allgemein',
    q: 'Für wen eignet sich FestSchmiede?',
    a: 'Für Vereine, Feuerwehren, Schulen, Hilfsorganisationen und Kommunen, die Feste mit Essens- und Getränkeverkauf digital organisieren möchten – von Dorffest bis Schützenfest.',
  },
  {
    category: 'allgemein',
    q: 'Welche Kernabläufe deckt die Plattform ab?',
    a: 'Gäste bestellen online oder vor Ort, die Küche arbeitet Bestellungen ab, Abholung und Abholboard koordinieren die Ausgabe. Optional kommen Online-Zahlungen, Benachrichtigungen und Auswertungen hinzu.',
  },
  {
    category: 'allgemein',
    q: 'Ist FestSchmiede auch Vereinssoftware im klassischen Sinne?',
    a: 'FestSchmiede fokussiert auf Veranstaltungsabläufe (Bestellung, Küche, Abholung), nicht auf Mitgliederverwaltung oder Buchhaltung. Viele Vereine kombinieren beides mit bestehenden Tools.',
  },
  {
    category: 'allgemein',
    q: 'Welche Veranstaltungen profitieren am meisten?',
    a: 'Feste mit Essens- und Getränkeverkauf und mehreren Helferstationen: Feuerwehrfeste, Schützenfeste, Kirmes, Dorffeste, Straßenfeste und Vereinsjubiläen.',
  },
  {
    category: 'allgemein',
    q: 'Eignet sich FestSchmiede nur für große Feste?',
    a: 'Nein. Auch kleinere Vereinsfeste profitieren, wenn Warteschlangen, Küchenchaos oder unklare Abholung regelmäßig Stress verursachen. Der Nutzen steigt mit Parallelbetrieb mehrerer Stationen.',
  },
  {
    category: 'allgemein',
    q: 'Was unterscheidet FestSchmiede von Excel und Zetteln?',
    a: 'Statt paralleler Listen und Zurufen laufen Bestellung, Küche und Abholung in einem gemeinsamen System – mit weniger Doppelarbeit und klarerem Status für alle.',
  },
  {
    category: 'allgemein',
    q: 'Unterstützt FestSchmiede mehrere Veranstaltungen?',
    a: 'Ja. Veranstaltungen lassen sich zentral anlegen und verwalten – inklusive Speisen, Getränke und Einstellungen pro Event, auch parallel.',
  },

  {
    category: 'kosten-open-source',
    q: 'Ist FestSchmiede kostenlos?',
    a: 'Der Quellcode ist Open Source. Gemeinnützige Organisationen können einen kostenlosen Plattform-Mandanten beantragen. Alternativ lässt sich die Software selbst hosten; dann fallen nur eure eigenen Server- und Betriebskosten an.',
  },
  {
    category: 'kosten-open-source',
    q: 'Was kostet FestSchmiede?',
    a: 'FestSchmiede ist Open Source. Der Betrieb kann selbst gehostet oder über einen Plattform-Mandanten erfolgen. Für gemeinnützige Organisationen kann ein kostenloser Mandant beantragt werden.',
  },
  {
    category: 'kosten-open-source',
    q: 'Ist FestSchmiede Open Source?',
    a: 'Ja. Der Quellcode ist auf GitHub einsehbar: nachvollziehbar, erweiterbar und ohne geschlossenes Anbieter-Lock-in. Beiträge und Feedback aus dem Vereinsalltag sind willkommen.',
  },
  {
    category: 'kosten-open-source',
    q: 'Wie helfe ich dem Projekt?',
    a: 'Feedback aus dem Vereinsalltag, Verbesserungsvorschläge, Beiträge zum Code oder Unterstützung der Weiterentwicklung helfen – Details stehen auf der Open-Source- und Projektseite.',
  },

  {
    category: 'mandant-start',
    q: 'Was bedeutet mandantenfähig?',
    a: 'Jede Organisation erhält eine eigene Instanz unter einem eigenen Pfad. Daten, Menüs und Einstellungen bleiben getrennt; Module lassen sich pro Mandant aktivieren.',
  },
  {
    category: 'mandant-start',
    q: 'Wer darf einen Mandanten beantragen?',
    a: 'Vereine, gemeinnützige Organisationen, Schulen, Hilfsorganisationen und ähnliche Gruppen, die FestSchmiede für ihre Veranstaltungen nutzen möchten. Über „Mandant beantragen“ stellt ihr eine Bewerbung.',
  },
  {
    category: 'mandant-start',
    q: 'Wie starte ich als Verein?',
    a: 'Über „Mandant beantragen“ könnt ihr eine Instanz anfragen. Alternativ prüft ihr Self-Hosting über Dokumentation und Installer. Vor dem Fest lohnt ein Probelauf mit dem Team.',
  },
  {
    category: 'mandant-start',
    q: 'Gibt es einen Setup-Assistenten?',
    a: 'Ja. Neue Mandanten durchlaufen beim ersten Admin-Login einen Einrichtungsassistenten für Organisation, Veranstaltung und typische Abläufe wie Küche und Abholung.',
  },
  {
    category: 'mandant-start',
    q: 'Wie lange dauert die Einführung?',
    a: 'Menü und Veranstaltung könnt ihr oft in wenigen Stunden anlegen. Entscheidend ist ein kurzer Probelauf mit Küche und Ausgabe vor dem Festtag.',
  },
  {
    category: 'mandant-start',
    q: 'Wo finde ich Screenshots und Dokumentation?',
    a: 'Auf der Marketing-Website unter Funktionen, Screenshots und Dokumentation sowie im GitHub-Repository. Dort seht ihr Bestellseite, Küche, Abholboard und Administration im Überblick.',
  },

  {
    category: 'bestaellung-ablauf',
    q: 'Wie funktioniert die Essensbestellung für Gäste?',
    a: 'Über die öffentliche Bestellseite wählen Gäste Speisen und Getränke – am Smartphone, Tablet oder Monitor vor Ort. Die Bestellung landet im System; Status und Abholnummer sind später nachvollziehbar.',
  },
  {
    category: 'bestaellung-ablauf',
    q: 'Können Gäste vorbestellen?',
    a: 'Ja. Vorausbestellungen entlasten Warteschlangen und helfen der Küche bei der Planung. Am Event-Tag lassen sich Abläufe so steuern, dass Vorbestellungen und Tagesgeschäft zusammenpassen.',
  },
  {
    category: 'bestaellung-ablauf',
    q: 'Was ist ein Küchenmonitor?',
    a: 'Die Küchenansicht zeigt offene Bestellungen in Echtzeit – ideal auf Tablet oder Monitor. Helfer starten die Bearbeitung, markieren Bestellungen als fertig und behalten auch bei Stoßzeiten den Überblick.',
  },
  {
    category: 'bestaellung-ablauf',
    q: 'Wozu dienen Abholnummern?',
    a: 'Jede Bestellung erhält eine Abholnummer. Gäste sehen sie im Status, die Ausgabe bestätigt damit die Übergabe, und das Abholboard zeigt öffentlich, welche Nummern bereitliegen.',
  },
  {
    category: 'bestaellung-ablauf',
    q: 'Wie funktioniert das Abholboard?',
    a: 'Sobald die Küche eine Bestellung als fertig markiert, erscheint die Abholnummer auf dem Abholboard. Gäste erkennen ohne Zurufen, wann sie abholen können.',
  },
  {
    category: 'bestaellung-ablauf',
    q: 'Was ist der Unterschied zwischen Abholung und Abholboard?',
    a: 'Abholung ist der Prozess am Tresen: Nummer prüfen und Ausgabe bestätigen. Das Abholboard ist die öffentliche Anzeige fertiger Nummern im Wartebereich.',
  },
  {
    category: 'bestaellung-ablauf',
    q: 'Wie werden Gäste über den Status informiert?',
    a: 'Über Bestellstatus und Abholnummer sehen Gäste, ob die Bestellung in Arbeit oder abholbereit ist. E-Mail- und optional Push-Benachrichtigungen unterstützen zusätzlich je nach Konfiguration.',
  },
  {
    category: 'bestaellung-ablauf',
    q: 'Was passiert bei ausverkauften Speisen?',
    a: 'Pro Veranstaltung lassen sich Speisen und Getränke als ausverkauft markieren. Die Änderung erscheint sofort auf der Bestellseite und verhindert unnötige Küchenarbeit.',
  },
  {
    category: 'bestaellung-ablauf',
    q: 'Gibt es Bestellung vor Ort / Kasse?',
    a: 'Ja. Mitarbeiter können Bestellungen vor Ort aufgeben (Kassenbestellung), parallel zur öffentlichen Online-Bestellung. So bleibt der Verkauf am Tresen im selben System wie die Vorbestellungen.',
  },

  {
    category: 'zahlung',
    q: 'Gibt es Online-Zahlungen?',
    a: 'Ja. FestSchmiede unterstützt modulare Zahlungsintegrationen. Welche Anbieter verfügbar sind, hängt von der Mandanten-Konfiguration ab. Zahlung bei Abholung an der Kasse ist ebenfalls möglich.',
  },
  {
    category: 'zahlung',
    q: 'Können wir Bargeld und Online-Zahlung mischen?',
    a: 'Ja. Typisch ist die Kombination aus Online-Zahlung und Zahlung bei Abholung – je nachdem, was für Gäste und Helfer am besten passt.',
  },
  {
    category: 'zahlung',
    q: 'Welche Zahlungsanbieter werden unterstützt?',
    a: 'FestSchmiede unterstützt modulare Zahlungsintegrationen. Konkrete Anbieter hängen von der Mandanten-Konfiguration ab.',
  },

  {
    category: 'helfer-alltag',
    q: 'Brauche ich technische Vorkenntnisse?',
    a: 'Für den Festbetrieb nicht. Helfer arbeiten mit klaren Oberflächen für Bestellung, Küche und Abholung. Einrichtung und Self-Hosting profitieren von etwas IT-Erfahrung.',
  },
  {
    category: 'helfer-alltag',
    q: 'Wie arbeiten Helfer mit FestSchmiede?',
    a: 'Über Rollenvorlagen (z. B. Küche, Abholung, Kasse) sehen Helfer nur die Bereiche, die zu ihrer Aufgabe passen. Anmeldung ist webbasiert; auf Tablets lässt sich die App als PWA zum Startbildschirm hinzufügen.',
  },
  {
    category: 'helfer-alltag',
    q: 'Funktioniert FestSchmiede auf dem Smartphone?',
    a: 'Ja. Die Oberflächen sind responsive und laufen auf Smartphone, Tablet und Desktop – wichtig für Helfer in Küche und Ausgabe sowie für Gäste beim Bestellen.',
  },
  {
    category: 'helfer-alltag',
    q: 'Gibt es Auswertungen nach dem Fest?',
    a: 'Dashboard und Statistiken helfen während und nach der Veranstaltung: Verkaufszahlen, Beliebtheit von Speisen und Überblick über den Ablauf.',
  },
  {
    category: 'helfer-alltag',
    q: 'Wie hilft Digitalisierung bei Helferplanung?',
    a: 'FestSchmiede ist kein separates Schichtplan-Modul. Klare Bestell- und Küchenprozesse reduzieren Chaos und machen Einsätze planbarer – ergänzend zu eurer Schichtliste.',
  },
  {
    category: 'helfer-alltag',
    q: 'Kann ich Getränkeabrechnung damit machen?',
    a: 'Es gibt kein dediziertes Getränkeabrechnungs-Modul. Verkäufe über Bestellungen und Auswertungen liefern aber belastbare Zahlen für Nachkalkulation und Kassenabschluss.',
  },

  {
    category: 'technik-hosting',
    q: 'Kann ich FestSchmiede selbst hosten?',
    a: 'Ja. Dokumentation, Installer und Quellcode unterstützen den Eigenbetrieb (u. a. Docker-basiert). Für den Festalltag reicht die webbasierte Verwaltung; Self-Hosting braucht grundlegende Server-Kenntnisse.',
  },
  {
    category: 'technik-hosting',
    q: 'Brauche ich technisches Know-how?',
    a: 'Für den täglichen Betrieb nicht. Die Verwaltung ist webbasiert. Für Self-Hosting sind grundlegende Server-Kenntnisse hilfreich.',
  },
  {
    category: 'technik-hosting',
    q: 'Kann ich Module einzeln aktivieren?',
    a: 'Ja. Die Plattform ist modular: Ihr aktiviert die Funktionen, die ihr wirklich braucht, und haltet die Oberfläche für Helfer schlank.',
  },
  {
    category: 'technik-hosting',
    q: 'Gibt es Bondruck?',
    a: 'Bondruck ist als optionales Modul vorgesehen und lässt sich pro Mandant konfigurieren. Ob und wie ihr druckt, hängt von Hardware und Einstellungen ab.',
  },

  {
    category: 'datenschutz',
    q: 'Wie sicher sind die Daten / wie steht es um Datenschutz?',
    a: 'Mandanten sind voneinander getrennt. Beim Plattformbetrieb gelten die kommunizierten Betriebs- und Datenschutzregeln; beim Self-Hosting liegen Verantwortung und Absicherung bei euch. Bestelldaten dienen der Abwicklung und werden gemäß Datenschutzerklärung behandelt.',
  },
];
