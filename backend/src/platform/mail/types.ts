export interface PlatformSmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  senderName: string;
  replyTo: string;
  secure: boolean;
  useTls: boolean;
  timeout: number;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  tenantId?: string;
  template?: string;
}

export interface MailSendResult {
  ok: boolean;
  error?: string;
}

export interface MailQueueStatus {
  pending: number;
  sent: number;
  failed: number;
  total: number;
  lastSentAt: string | null;
}

export type MailTemplateId = 'login-code' | 'magic-link' | 'initial-setup' | 'test-mail' | 'password-reset';
