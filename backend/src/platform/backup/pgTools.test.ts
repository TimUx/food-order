import { spawn } from 'child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertPgToolsAvailable } from './pgTools';

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

describe('assertPgToolsAvailable', () => {
  afterEach(() => {
    vi.mocked(spawn).mockReset();
  });

  it('prüft Verfügbarkeit per command -v statt --version', async () => {
    vi.mocked(spawn).mockImplementation((_cmd, args) => {
      const shellCmd = String(args?.[1] ?? '');
      const child = {
        on: (event: string, handler: (code?: number) => void) => {
          if (event === 'close') {
            handler(shellCmd.includes('pg_dump') ? 1 : 0);
          }
          return child;
        },
      };
      return child as never;
    });

    await expect(assertPgToolsAvailable()).rejects.toThrow("Befehl 'pg_dump' nicht verfügbar");

    expect(spawn).toHaveBeenCalledWith('sh', ['-c', 'command -v pg_dump >/dev/null 2>&1']);
    expect(spawn).not.toHaveBeenCalledWith('pg_dump', ['--version']);
    expect(spawn).not.toHaveBeenCalledWith('gunzip', ['--version']);
  });
});
