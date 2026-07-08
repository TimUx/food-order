import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';
import { formatPrice } from '../utils/helpers';

const transporter =
  config.smtp.host
    ? nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: config.smtp.user
          ? { user: config.smtp.user, pass: config.smtp.pass }
          : undefined,
      })
    : null;

export const emailService = {
  async sendOrderConfirmation(
    email: string,
    order: {
      displayNumber: string;
      totalPrice: number;
      items: { name: string; quantity: number; lineTotal: number }[];
    }
  ) {
    if (!transporter) {
      logger.info('SMTP nicht konfiguriert – E-Mail wird übersprungen');
      return;
    }

    const itemsList = order.items
      .map((i) => `${i.quantity}x ${i.name} – ${formatPrice(i.lineTotal)}`)
      .join('\n');

    const html = `
      <h2>Bestellbestätigung</h2>
      <p>Vielen Dank für Ihre Bestellung!</p>
      <p><strong>Ihre Abholnummer: ${order.displayNumber}</strong></p>
      <p>Bitte merken Sie sich diese Nummer oder zeigen Sie sie an der Kasse vor.</p>
      <h3>Bestellung:</h3>
      <pre>${itemsList}</pre>
      <p><strong>Gesamt: ${formatPrice(order.totalPrice)}</strong></p>
    `;

    await transporter.sendMail({
      from: config.smtp.from,
      to: email,
      subject: `Bestellbestätigung – Abholnummer ${order.displayNumber}`,
      html,
    });

    logger.info(`Bestellbestätigung gesendet an ${email}`);
  },
};
