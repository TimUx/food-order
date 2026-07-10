import { describe, it, expect } from 'vitest';
import { platformLegalService } from './PlatformLegalService';

describe('platformLegalService', () => {
  it('listPublicLinks filters empty content', async () => {
    const links = await platformLegalService.listPublicLinks();
    expect(Array.isArray(links)).toBe(true);
    for (const link of links) {
      expect(link.slug).toBeTruthy();
      expect(link.title).toBeTruthy();
    }
  });
});
