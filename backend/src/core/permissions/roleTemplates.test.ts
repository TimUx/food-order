import { describe, it, expect } from 'vitest';
import { parseStoredRoleTemplates, isTenantRoleTemplateId } from './roleTemplates';

describe('roleTemplates helpers', () => {
  it('erkennt gültige Vorlagen-IDs', () => {
    expect(isTenantRoleTemplateId('kasse')).toBe(true);
    expect(isTenantRoleTemplateId('invalid')).toBe(false);
  });

  it('liest mehrere gespeicherte Vorlagen', () => {
    expect(parseStoredRoleTemplates({ roleTemplates: ['kasse', 'abholung'], roleTemplate: 'kueche' }))
      .toEqual(['kasse', 'abholung']);
  });

  it('fällt auf einzelne Legacy-Vorlage zurück', () => {
    expect(parseStoredRoleTemplates({ roleTemplates: [], roleTemplate: 'abholung' }))
      .toEqual(['abholung']);
  });

  it('filtert unbekannte Vorlagen-IDs', () => {
    expect(parseStoredRoleTemplates({ roleTemplates: ['kasse', 'unknown'], roleTemplate: null }))
      .toEqual(['kasse']);
  });
});
