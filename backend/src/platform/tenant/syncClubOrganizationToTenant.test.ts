import { describe, it, expect } from 'vitest';
import {
  mapClubValuesToTenantUpdate,
  pickOrganizationFields,
} from './syncClubOrganizationToTenant';

describe('syncClubOrganizationToTenant', () => {
  it('maps club organization fields to tenant update', () => {
    expect(
      mapClubValuesToTenantUpdate({
        clubName: 'ASV Libelle',
        logoUrl: '/uploads/t1/logo-abc.webp',
        email: 'info@example.de',
      })
    ).toEqual({
      name: 'ASV Libelle',
      shortName: 'ASV Libelle',
      logoUrl: '/uploads/t1/logo-abc.webp',
      email: 'info@example.de',
    });
  });

  it('ignores unrelated fields', () => {
    expect(
      pickOrganizationFields({
        clubName: 'Test',
        smtpHost: 'smtp.example.de',
        orderFieldEmailRequired: true,
      })
    ).toEqual({
      clubName: 'Test',
    });
  });
});
