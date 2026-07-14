const MAILPIT_BASE = process.env.QA_MAILPIT_BASE || 'http://localhost:8025';

interface MailpitMessageSummary {
  ID: string;
  Subject: string;
  To: { Address: string }[];
}

interface MailpitMessage {
  Text: string;
  HTML: string;
}

const TEMP_PASSWORD_RE = /Temporäres Passwort:\s*([A-Za-z0-9]+)/;
const CODE_TAG_RE = /<code>([A-Za-z0-9]+)<\/code>/;

async function fetchMessages(query?: string): Promise<MailpitMessageSummary[]> {
  const url = new URL('/api/v1/messages', MAILPIT_BASE);
  if (query) url.searchParams.set('query', query);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mailpit messages failed: ${res.status}`);
  const data = (await res.json()) as { messages?: MailpitMessageSummary[] };
  return data.messages ?? [];
}

async function fetchMessageBody(id: string): Promise<string> {
  const res = await fetch(`${MAILPIT_BASE}/api/v1/message/${id}`);
  if (!res.ok) throw new Error(`Mailpit message ${id} failed: ${res.status}`);
  const data = (await res.json()) as MailpitMessage;
  return `${data.Text}\n${data.HTML}`;
}

export async function waitForTemporaryPassword(
  recipientEmail: string,
  options: { timeoutMs?: number; pollMs?: number } = {}
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 45_000;
  const pollMs = options.pollMs ?? 1_500;
  const deadline = Date.now() + timeoutMs;
  const needle = recipientEmail.toLowerCase();

  while (Date.now() < deadline) {
    const messages = await fetchMessages(`to:${needle}`);
    for (const message of messages) {
      const body = await fetchMessageBody(message.ID);
      const plain = body.match(TEMP_PASSWORD_RE);
      if (plain?.[1]) return plain[1];
      const html = body.match(CODE_TAG_RE);
      if (html?.[1] && body.includes('Passwort')) return html[1];
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }

  throw new Error(`Kein Zugangs-Mail mit temporärem Passwort für ${recipientEmail} in Mailpit`);
}
