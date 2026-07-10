/**
 * Consent-Management-Vorbereitung.
 *
 * Aktuell verwendet FestManager ausschließlich technisch notwendige Cookies
 * (Session/Auth). Ein Cookie-Banner ist daher nicht erforderlich.
 *
 * Sollten künftig Analyse- oder Marketingdienste integriert werden,
 * kann hier ein Consent-Provider angebunden werden.
 */
export type ConsentCategory = 'necessary' | 'analytics' | 'marketing';

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

export const DEFAULT_CONSENT: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export function readConsentState(): ConsentState {
  return DEFAULT_CONSENT;
}

export function requiresConsentBanner(): boolean {
  return false;
}
