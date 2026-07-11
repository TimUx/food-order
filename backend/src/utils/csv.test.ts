import { describe, it, expect } from 'vitest';
import { csvCell, csvRow } from './csv';

describe('csv', () => {
  it('escaped Semikolons und Anführungszeichen', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('baut Zeilen mit Semikolon-Trenner', () => {
    expect(csvRow(['001', 'Neu', 'Max; Mustermann'])).toBe('001;Neu;"Max; Mustermann"');
  });
});
