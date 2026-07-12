export const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{2,31}$/;

export type LoginIdentifierType = 'email' | 'username';

export function parseLoginIdentifier(input: string): { type: LoginIdentifierType; value: string } {
  const trimmed = input.trim();
  if (trimmed.includes('@')) {
    return { type: 'email', value: trimmed.toLowerCase() };
  }
  return { type: 'username', value: normalizeUsername(trimmed) };
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}
